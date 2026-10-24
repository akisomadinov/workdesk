namespace Workdesk.Services;

public static class GitLabWorkflow
{
    public static (string Stage, string Blocker) InitialState(string state, IEnumerable<string> labels)
    {
        var names = labels.Select(label => label.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (state.Equals("closed", StringComparison.OrdinalIgnoreCase) || names.Contains("TestDone")) return ("done", "");
        if (names.Contains("Test")) return ("waiting", "Ожидается результат тестирования.");
        if (names.Contains("DevDone")) return ("waiting", "MR отправлен на ревью. Ожидается ответ ревьюера.");
        if (names.Contains("InProgress")) return ("doing", "");
        if (names.Contains("ToDo") || names.Contains("bugs")) return ("planned", "");
        return ("inbox", "");
    }
}
