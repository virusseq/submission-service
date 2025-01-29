# VirusSeq Data Submission Service

The application provides a server that can be used to handle HTTP requests to interact with [Overture Lyric](https://github.com/overture-stack/lyric) for Data Submission

This project is intended to managed as a monorepo using [PNPM](https://pnpm.io/) package manager.

## System Dependencies

To Successfully run Submission Service (as is) you need the following services to be deployed and configure it to use them:

- [Postgres Relational Database](https://www.postgresql.org/) For data storage 
- [Overture Lectern](https://github.com/overture-stack/lectern) Dictionary Management and validation
- [Overture EGO](https://github.com/overture-stack/ego) (Optional) Authentication and Authorization Microservice 

### Development tools

- [PNPM](https://pnpm.io/) Project manager
- [Node.js](https://nodejs.org/en) Runtime environment (v20 or higher)
- [VS Code](https://code.visualstudio.com/) As recommended code editor. Plugins recommended: ESLint, Prettier - Code formatter, Mocha Test Explorer, Monorepo Workspace


### Quickstart development

To set up this project locally, follow these steps from the root folder.

1. Install Dependencies:

   Run the following command to install all necessary dependencies:

   ```
   pnpm i
   ```

2. Build the Workspace:

   Use the following command to build the entire workspace:

   ```
   pnpm run build:all
   ```

3. Set Environment Variables:

   Refer to the [Environment Variables](#environment-variables) section to configure the required environment variables.

4. Start the Server in Development Mode:

   Once the build is complete, start the server in development mode using the command described in the [Script Commands](#script-commands) section:

   ```
   pnpm run start:dev
   ```

   By default, the server runs on port 3030.

5. Interact with API Endpoints:

   A Swagger web interface is available to interact with the API endpoints. Access it at http://localhost:3030/api-docs/.

## Environment variables

Create a `.env` file based on `.env.schema` located on the root folder and set the environment variables for your application.

The Environment Variables used for this application are listed in the table bellow

| Name                        | Description                                                                                                                                                                                                                                                                                          | Default                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `ALLOWED_ORIGINS`             | A list of allowed origins that can make requests to your server, each allowed origin separated by a comma `(,)`                                                                                                                                                              |                                    |
| `AUDIT_ENABLED`             | Ensures that any modifications to the submitted data are logged, providing a way to identify who made changes and when they were made                                                                                                                                                               | true                                   |
| `AUTH_ENABLED`             | A flag that enables or disables authentication                                                                                                                                                         | false                                   |
| `AUTH_PUBLIC_KEY`             | The public key used to verify the authenticity of JWT tokens. It is required when `AUTH_ENABLED` is set to `true`                                                                                                                                                                |                                    |
| `DB_HOST`                   | Database Hostname                                                                                                                                                                                                                                                                                    |                                        |
| `DB_NAME`                   | Database Name                                                                                                                                                                                                                                                                                        |                                        |
| `DB_PASSWORD`               | Database Password                                                                                                                                                                                                                                                                                    |                                        |
| `DB_PORT`                   | Database Port                                                                                                                                                                                                                                                                                        |                                        |
| `DB_USER`                   | Database User                                                                                                                                                                                                                                                                                        |                                        |
| `ID_CUSTOM_ALPHABET`        | Custom Alphabet for local ID generation                                                                                                                                                                                                                                                              | '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' |
| `ID_CUSTOM_SIZE`            | Custom size of ID for local ID generation                                                                                                                                                                                                                                                            | 21                                     |
| `ID_USELOCAL`               | Generate ID locally                                                                                                                                                                                                                                                                                  | true                                   |
| `LECTERN_URL`               | Schema Service (Lectern) URL                                                                                                                                                                                                                                                                         |                                        |
| `LOG_LEVEL`                 | Log Level                                                                                                                                                                                                                                                                                            | 'info'                                 |
| `PLURALIZE_SCHEMAS_ENABLED` | This feature automatically convert schema names to their plural forms when handling compound documents. Pluralization assumes the words are in English                                                                                                                                               | true                                   |
| `SERVER_PORT`                      | Server Port.                                                                                                                                                                                                                                                                                         | 3030                                   |
| `SERVER_UPLOAD_LIMIT`              | Limit upload file size in string or number. <br>Supported units and abbreviations are as follows and are case-insensitive: <br> - b for bytes<br> - kb for kilobytes<br>- mb for megabytes<br>- gb for gigabytes<br>- tb for terabytes<br>- pb for petabytes<br>Any other text is considered as byte | '10mb'   


## Script commands

This project contains the following scripts for managing the build and development processes. You can run any of these scripts using the following command: `pnpm run <script-name>`

| Script Name                 | Description                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build:compile`                 | Cleans and builds the entire project                                                      |
| `build:copy`                 | Copy Open API files required for serving in a production environment                                                                                                                         |
| `build:all`                 | Bundles the build tasks for production distribution                                                                                                                         |
| `lint`                      | Runs ESLint to lint all files in the current directory (and subdirectories). It checks for code quality issues, potential errors, and style violations according to the project's ESLint configuration |
| `lint:fix`                  | Runs ESLint to lint all files in the current directory (and subdirectories), and automatically fixes issues that can be resolved (e.g., formatting, missing semicolons).                               |
| `migrate:db:dev`                 | Runs database migration in dev environment                                                                                                                               |
| `start:dev`                 | Starts the development server with live-reloading and debugging enabled.                                                                                                                               |
| `migrate:db:prod`                 | Runs database migration in production environment                                                                                                                               |
| `start:prod`                | Starts the production server optimized for performance and stability (The application must be built beforehand).                                                                                       |