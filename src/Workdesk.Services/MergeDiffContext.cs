using System.Text.RegularExpressions;
using Workdesk.Data;

namespace Workdesk.Services;

public static partial class MergeDiffContext
{
    [GeneratedRegex(@"^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@", RegexOptions.NonBacktracking)]
    private static partial Regex Header();

    public static List<MergeCodeLine> Extract(string diff, int? oldLine, int? newLine, int? oldStart = null, int? newStart = null)
    {
        var hunk = new List<MergeCodeLine>();
        int old = 0, current = 0;
        var active = false;
        foreach (var line in diff.Split('\n'))
        {
            var match = Header().Match(line);
            if (match.Success)
            {
                var found = Around(hunk);
                if (found.Count > 0) return found;
                hunk.Clear();
                active = int.TryParse(match.Groups[1].Value, out old) && int.TryParse(match.Groups[2].Value, out current);
                continue;
            }
            if (!active || line.Length == 0 || line[0] is not (' ' or '+' or '-')) continue;
            int? before = line[0] == '+' ? null : old++;
            int? after = line[0] == '-' ? null : current++;
            var highlighted = newLine is not null
                ? after >= (newStart ?? newLine) && after <= newLine
                : oldLine is not null && before >= (oldStart ?? oldLine) && before <= oldLine;
            hunk.Add(new(before, after, line[0] == '+' ? "added" : line[0] == '-' ? "removed" : "context", line[1..].TrimEnd('\r'), highlighted));
        }
        return Around(hunk);
    }
    private static List<MergeCodeLine> Around(List<MergeCodeLine> lines)
    {
        var first = lines.FindIndex(x => x.Highlighted);
        if (first < 0) return [];
        var start = Math.Max(0, first - 3);
        var end = Math.Min(lines.Count, lines.FindLastIndex(x => x.Highlighted) + 4);
        return lines.Skip(start).Take(Math.Min(24, end - start)).ToList();
    }
}
