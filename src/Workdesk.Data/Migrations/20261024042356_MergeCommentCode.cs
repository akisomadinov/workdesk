using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workdesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class MergeCommentCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodeContext",
                table: "MergeComment",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodeContext",
                table: "MergeComment");
        }
    }
}
