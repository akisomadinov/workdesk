FROM node:25-bookworm-slim AS frontend
WORKDIR /client
RUN corepack enable
COPY client/package.json client/yarn.lock client/.yarnrc.yml ./
RUN corepack yarn install --immutable
COPY client/ ./
RUN corepack yarn build --outDir /frontend-build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /source
COPY Directory.Build.props NuGet.Config ./
COPY src/Workdesk.Data/Workdesk.Data.csproj src/Workdesk.Data/
COPY src/Workdesk.Services/Workdesk.Services.csproj src/Workdesk.Services/
COPY src/Workdesk.Server/Workdesk.Server.csproj src/Workdesk.Server/
RUN dotnet restore src/Workdesk.Server --configfile NuGet.Config
COPY src/ src/
COPY --from=frontend /frontend-build/ src/Workdesk.Server/wwwroot/
RUN dotnet publish src/Workdesk.Server -c Release --no-restore -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN mkdir /data && chown "$APP_UID" /data
COPY --from=backend /app/ ./
USER $APP_UID
ENV WORKDESK_DATA_DIR=/data WORKDESK_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Workdesk.Server.dll"]
