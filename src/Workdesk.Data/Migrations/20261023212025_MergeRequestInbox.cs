using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workdesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class MergeRequestInbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MergeRequestId",
                table: "Notification",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MergeRequestsSyncedThrough",
                table: "Connections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MergeRequest",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ConnectionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ExternalKey = table.Column<string>(type: "TEXT", nullable: false),
                    Project = table.Column<string>(type: "TEXT", nullable: false),
                    Number = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    State = table.Column<string>(type: "TEXT", nullable: false),
                    Author = table.Column<string>(type: "TEXT", nullable: false),
                    Reviewers = table.Column<string>(type: "TEXT", nullable: false),
                    SourceBranch = table.Column<string>(type: "TEXT", nullable: false),
                    TargetBranch = table.Column<string>(type: "TEXT", nullable: false),
                    IsAuthor = table.Column<bool>(type: "INTEGER", nullable: false),
                    NeedsMyReview = table.Column<bool>(type: "INTEGER", nullable: false),
                    Draft = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotificationsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    SourceUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Created = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Modified = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MergeRequest", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MergeRequest_Connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalTable: "Connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MergeComment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MergeRequestId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ExternalKey = table.Column<string>(type: "TEXT", nullable: false),
                    Author = table.Column<string>(type: "TEXT", nullable: false),
                    Body = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    IsOwn = table.Column<bool>(type: "INTEGER", nullable: false),
                    Read = table.Column<bool>(type: "INTEGER", nullable: false),
                    PostedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Created = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Modified = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MergeComment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MergeComment_MergeRequest_MergeRequestId",
                        column: x => x.MergeRequestId,
                        principalTable: "MergeRequest",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MergeComment_MergeRequestId_ExternalKey",
                table: "MergeComment",
                columns: new[] { "MergeRequestId", "ExternalKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MergeRequest_ConnectionId_ExternalKey",
                table: "MergeRequest",
                columns: new[] { "ConnectionId", "ExternalKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MergeComment");

            migrationBuilder.DropTable(
                name: "MergeRequest");

            migrationBuilder.DropColumn(
                name: "MergeRequestId",
                table: "Notification");

            migrationBuilder.DropColumn(
                name: "MergeRequestsSyncedThrough",
                table: "Connections");
        }
    }
}
