using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Text;

namespace Workdesk.Services;

public sealed class SecretStoreOptions { public string Directory { get; init; } = ""; public string? MasterKeyFile { get; init; } }

public interface ISecretStore
{
    bool Has(Guid id);
    string? Get(Guid id);
    void Set(Guid id, string token);
}

// On macOS tokens never enter SQLite, exports or application files.
// Other operating systems use AES-GCM when an external master key is configured, or memory in local mode.
public sealed class SecretStore(SecretStoreOptions? options = null) : ISecretStore
{
    private readonly ConcurrentDictionary<Guid, string> memory = new();
    private static readonly byte[] Service = Encoding.UTF8.GetBytes("Workdesk.Local");
    public bool Has(Guid id)
    {
        if (!OperatingSystem.IsMacOS()) return HasFileVault ? File.Exists(SecretPath(id)) : memory.ContainsKey(id);
        var account = Encoding.UTF8.GetBytes(id.ToString());
        var status = FindMetadata(IntPtr.Zero, (uint)Service.Length, Service, (uint)account.Length, account, IntPtr.Zero, IntPtr.Zero, out var item);
        if (item != IntPtr.Zero) Release(item);
        return status == 0;
    }
    public string? Get(Guid id)
    {
        if (!OperatingSystem.IsMacOS()) return HasFileVault ? ReadFile(id) : memory.GetValueOrDefault(id);
        var account = Encoding.UTF8.GetBytes(id.ToString());
        var status = Find(IntPtr.Zero, (uint)Service.Length, Service, (uint)account.Length, account, out var length, out var data, out var item);
        try
        {
            if (status == -25300) return null;
            if (status != 0) throw new AppException("Связка ключей macOS недоступна. Разреши доступ к Workdesk и повтори попытку.");
            var bytes = new byte[length]; Marshal.Copy(data, bytes, 0, (int)length);
            return Encoding.UTF8.GetString(bytes);
        }
        finally { if (data != IntPtr.Zero) Free(IntPtr.Zero, data); if (item != IntPtr.Zero) Release(item); }
    }
    public void Set(Guid id, string token)
    {
        if (!OperatingSystem.IsMacOS()) { if (HasFileVault) WriteFile(id, token); else memory[id] = token; return; }
        var account = Encoding.UTF8.GetBytes(id.ToString()); var value = Encoding.UTF8.GetBytes(token);
        var status = Find(IntPtr.Zero, (uint)Service.Length, Service, (uint)account.Length, account, out _, out var data, out var item);
        if (data != IntPtr.Zero) Free(IntPtr.Zero, data);
        try
        {
            var result = status == -25300
                ? Add(IntPtr.Zero, (uint)Service.Length, Service, (uint)account.Length, account, (uint)value.Length, value, out item)
                : status == 0 ? Modify(item, IntPtr.Zero, (uint)value.Length, value) : status;
            if (result != 0) throw new AppException("Не удалось сохранить токен в связке ключей macOS.");
        }
        finally { if (item != IntPtr.Zero) Release(item); }
    }
    private const string Security = "/System/Library/Frameworks/Security.framework/Security";
    private bool HasFileVault => !string.IsNullOrWhiteSpace(options?.MasterKeyFile);
    private string SecretPath(Guid id) => Path.Combine(options!.Directory, id.ToString("N") + ".bin");
    private byte[] MasterKey()
    {
        var key = File.ReadAllBytes(options!.MasterKeyFile!);
        if (key.Length != 32) throw new AppException("Неверный формат ключа хранилища секретов.");
        return key;
    }
    private string? ReadFile(Guid id)
    {
        var path = SecretPath(id); if (!File.Exists(path)) return null;
        var data = File.ReadAllBytes(path); if (data.Length < 28) throw new AppException("Не удалось открыть защищённый токен.");
        var plain = new byte[data.Length - 28];
        try { using var cipher = new System.Security.Cryptography.AesGcm(MasterKey(), 16); cipher.Decrypt(data.AsSpan(0, 12), data.AsSpan(28), data.AsSpan(12, 16), plain, id.ToByteArray()); }
        catch (System.Security.Cryptography.CryptographicException) { throw new AppException("Не удалось открыть защищённый токен."); }
        return Encoding.UTF8.GetString(plain);
    }
    private void WriteFile(Guid id, string value)
    {
        Directory.CreateDirectory(options!.Directory);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(options.Directory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var plain = Encoding.UTF8.GetBytes(value); var data = new byte[28 + plain.Length];
        System.Security.Cryptography.RandomNumberGenerator.Fill(data.AsSpan(0, 12));
        using var cipher = new System.Security.Cryptography.AesGcm(MasterKey(), 16);
        cipher.Encrypt(data.AsSpan(0, 12), plain, data.AsSpan(28), data.AsSpan(12, 16), id.ToByteArray());
        var temporary = SecretPath(id) + ".tmp"; File.WriteAllBytes(temporary, data);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(temporary, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        File.Move(temporary, SecretPath(id), true);
    }
    [DllImport(Security, EntryPoint = "SecKeychainFindGenericPassword")]
    private static extern int Find(IntPtr keychain, uint serviceLength, byte[] service, uint accountLength, byte[] account, out uint length, out IntPtr data, out IntPtr item);
    [DllImport(Security, EntryPoint = "SecKeychainFindGenericPassword")]
    private static extern int FindMetadata(IntPtr keychain, uint serviceLength, byte[] service, uint accountLength, byte[] account, IntPtr length, IntPtr data, out IntPtr item);
    [DllImport(Security, EntryPoint = "SecKeychainAddGenericPassword")]
    private static extern int Add(IntPtr keychain, uint serviceLength, byte[] service, uint accountLength, byte[] account, uint length, byte[] data, out IntPtr item);
    [DllImport(Security, EntryPoint = "SecKeychainItemModifyAttributesAndData")]
    private static extern int Modify(IntPtr item, IntPtr attributes, uint length, byte[] data);
    [DllImport(Security, EntryPoint = "SecKeychainItemFreeContent")]
    private static extern int Free(IntPtr attributes, IntPtr data);
    [DllImport("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation", EntryPoint = "CFRelease")]
    private static extern void Release(IntPtr value);
}
