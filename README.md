# Marketplace Auditor

A TypeScript application that downloads and tracks changes to transactions and licenses from the Atlassian Marketplace API.

## Features

- Downloads transactions and licenses from the Atlassian Marketplace API
- Stores data in a PostgreSQL database using TypeORM
- Tracks version history of all transactions and licenses
- Runs in a Docker container for easy deployment
- Manages a list of addons for tracking

## Prerequisites

- Docker and Docker Compose
- Atlassian Marketplace API key

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and update the environment variables:
   ```
   DB_HOST=db
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=marketplace
   ATLASSIAN_API_KEY=your_api_key_here
   ```

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

## Development

To run the application in development mode:

```bash
npm install
npm run dev
```

## Building

To build the application:

```bash
npm run build
```

## Running Tests

```bash
npm test
```

## Managing Addons

To add a new addon to track:

```bash
npm run add-addon -- <addon-key>
```

For example:
```bash
npm run add-addon -- com.atlassian.confluence.plugins.confluence-questions
```

## Database Schema

The application uses the following database schema:

- `Transaction`: Stores current transaction data
- `TransactionVersion`: Stores historical versions of transactions
- `License`: Stores current license data
- `LicenseVersion`: Stores historical versions of licenses
- `Addon`: Stores a list of addon keys to track

## License

MIT