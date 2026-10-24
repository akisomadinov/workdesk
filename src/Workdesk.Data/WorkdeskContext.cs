using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;

namespace Workdesk.Data;

public sealed class DateTimeUtcConverter() : ValueConverter<DateTime, DateTime>(
    value => value.ToUniversalTime(), value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

public sealed class WorkdeskContext(DbContextOptions<WorkdeskContext> options) : DbContext(options)
{
    public DbSet<WorkItem> Tasks => Set<WorkItem>();
    public DbSet<Connection> Connections => Set<Connection>();
    public DbSet<TelegramSettings> Telegram => Set<TelegramSettings>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder) =>
        builder.Properties<DateTime>().HaveConversion<DateTimeUtcConverter>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        var task = builder.Entity<WorkItem>();
        task.Property(x => x.OwnerId).HasDefaultValue(LocalIdentity.OwnerId);
        task.HasKey(x => x.Id);
        task.Property(x => x.Id).HasConversion(x => x.Value, x => new WorkItemId(x)).ValueGeneratedNever();
        task.Property(x => x.ConnectionId).HasConversion(x => x.HasValue ? x.Value.Value : (Guid?)null,
            x => x.HasValue ? new ConnectionId(x.Value) : null);
        task.Property(x => x.Revision).IsConcurrencyToken();
        task.HasIndex(x => new { x.ConnectionId, x.ExternalKey }).IsUnique();
        task.HasOne<Connection>().WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Restrict);
        var connection = builder.Entity<Connection>();
        connection.Property(x => x.OwnerId).HasDefaultValue(LocalIdentity.OwnerId);
        connection.HasKey(x => x.Id);
        connection.Property(x => x.Id).HasConversion(x => x.Value, x => new ConnectionId(x)).ValueGeneratedNever();
        builder.Entity<Account>().Property(x => x.Id).HasConversion(x => x.Value, x => new UserId(x)).ValueGeneratedNever();
        builder.Entity<Account>().HasIndex(x => x.Email).IsUnique();
        builder.Entity<Account>().HasIndex(x => x.Login).IsUnique();
        builder.Entity<Notification>().Property(x => x.Delivery).IsConcurrencyToken();
        builder.Entity<Workspace>().Property(x => x.Id).HasConversion(x => x.Value, x => new WorkspaceId(x)).ValueGeneratedNever();
        builder.Entity<Membership>().Property(x => x.Id).HasConversion(x => x.Value, x => new MembershipId(x)).ValueGeneratedNever();
        builder.Entity<Membership>().HasIndex(x => new { x.WorkspaceId, x.UserId }).IsUnique();
        builder.Entity<Invitation>().Property(x => x.Id).HasConversion(x => x.Value, x => new InvitationId(x)).ValueGeneratedNever();
        builder.Entity<Invitation>().Property(x => x.Used).IsConcurrencyToken();
        builder.Entity<Invitation>().HasIndex(x => x.TokenHash).IsUnique();
        builder.Entity<Note>().Property(x => x.Id).HasConversion(x => x.Value, x => new NoteId(x)).ValueGeneratedNever();
        builder.Entity<Note>().Property(x => x.Revision).IsConcurrencyToken();
        builder.Entity<NoteRevision>().Property(x => x.Id).HasConversion(x => x.Value, x => new RevisionId(x)).ValueGeneratedNever();
        builder.Entity<NoteRevision>().HasIndex(x => x.NoteId);
        builder.Entity<Notification>().Property(x => x.Id).HasConversion(x => x.Value, x => new NotificationId(x)).ValueGeneratedNever();
        builder.Entity<Notification>().HasIndex(x => new { x.OwnerId, x.EventKey }).IsUnique();
        builder.Entity<TelegramSettings>().HasKey(x => x.OwnerId);
        builder.Entity<TelegramLink>().HasKey(x => x.OwnerId);
        builder.Entity<TelegramLink>().HasIndex(x => x.TokenHash).IsUnique();
        builder.Entity<TelegramLink>().Property(x => x.TokenHash).IsConcurrencyToken();
        builder.Entity<TelegramLink>().Property(x => x.Used).IsConcurrencyToken();
        builder.Entity<TelegramInbox>().HasKey(x => x.BotId);
        builder.Entity<TelegramInbox>().Property(x => x.Offset).IsConcurrencyToken();
        var merge = builder.Entity<MergeRequest>();
        merge.Property(x => x.Id).HasConversion(x => x.Value, x => new MergeRequestId(x)).ValueGeneratedNever();
        merge.Property(x => x.ConnectionId).HasConversion(x => x.Value, x => new ConnectionId(x));
        merge.HasIndex(x => new { x.ConnectionId, x.ExternalKey }).IsUnique();
        merge.HasOne<Connection>().WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Cascade);
        var comment = builder.Entity<MergeComment>();
        comment.Property(x => x.CodeContext).HasConversion(
            x => JsonSerializer.Serialize(x, (JsonSerializerOptions?)null),
            x => JsonSerializer.Deserialize<MergeCodeContext>(x, (JsonSerializerOptions?)null));
        comment.Property(x => x.Id).HasConversion(x => x.Value, x => new MergeCommentId(x)).ValueGeneratedNever();
        comment.Property(x => x.MergeRequestId).HasConversion(x => x.Value, x => new MergeRequestId(x));
        comment.HasIndex(x => new { x.MergeRequestId, x.ExternalKey }).IsUnique();
        comment.HasOne<MergeRequest>().WithMany().HasForeignKey(x => x.MergeRequestId).OnDelete(DeleteBehavior.Cascade);
    }
}
