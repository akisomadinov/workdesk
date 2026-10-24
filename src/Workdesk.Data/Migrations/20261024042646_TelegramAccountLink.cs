using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workdesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class TelegramAccountLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "UseSharedBot",
                table: "Telegram",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "TelegramInbox",
                columns: table => new
                {
                    BotId = table.Column<string>(type: "TEXT", nullable: false),
                    Offset = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelegramInbox", x => x.BotId);
                });

            migrationBuilder.CreateTable(
                name: "TelegramLink",
                columns: table => new
                {
                    OwnerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TokenHash = table.Column<string>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Used = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelegramLink", x => x.OwnerId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TelegramLink_TokenHash",
                table: "TelegramLink",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TelegramInbox");

            migrationBuilder.DropTable(
                name: "TelegramLink");

            migrationBuilder.DropColumn(
                name: "UseSharedBot",
                table: "Telegram");
        }
    }
}
