# Data Submission Service

This service acts as a wrapper around the [@overture-stack/lyric](https://github.com/overture-stack/lyric) package, enabling efficient handling and management of data submissions. It adapts Lyric's functionality to meet VirusSeq's requirements, ensuring reliable data submission and data management

## Service Dependencies

- [Overture EGO](https://github.com/overture-stack/ego) (Optional) Authentication and Authorization Microservice
- [Overture Lectern](https://github.com/overture-stack/lectern) Dictionary Management and validation Service
- [Overture Maestro](https://github.com/overture-stack/maestro) (Optional) Organize data repositories into an Elasticsearch index
- [Postgres](https://www.postgresql.org/) Database for data storage

## Getting started

To set up the project locally and run it in development mode, follow these steps:

> [!IMPORTANT]  
> Ensure that you have the following tools installed:
>
> - [Node.js](https://nodejs.org/en): Runtime environment (v20 or higher)
> - [PNPM](https://pnpm.io/): This project uses pnpm to manage dependencies.

1.  Install Dependencies

Install the necessary dependencies using pnpm:

```
pnpm install
```

2. App configuration

The application requires specific environment variables to be configured. Follow these steps:

- Create a `.env` file in the root directory of the project.
- Copy the contents of the `.env.schema` file into your `.env` file.
- Modify the environment variables as needed to fit your local setup.

3. Build the project

Run the following command to compile the project:

```
pnpm run build:all
```

4. Start the Service in Development Mode

Now that your environment is configured and the project is compiled, you can start the service in development mode:

```
pnpm run start:dev
```

This will start the service in a local development environment. You can access the Swagger documentation at the default URL: http://localhost:3030/api-docs
