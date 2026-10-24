using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workdesk.Data.Migrations
{
    /// <inheritdoc />
    public partial class TelegramLinkConfirmation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ChatId",
                table: "TelegramLink",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConfirmationId",
                table: "TelegramLink",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "TelegramLink",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "TelegramLink",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "Telegram",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "Telegram",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChatId",
                table: "TelegramLink");

            migrationBuilder.DropColumn(
                name: "ConfirmationId",
                table: "TelegramLink");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "TelegramLink");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "TelegramLink");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "Telegram");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "Telegram");
        }
    }
}
