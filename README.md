# AI-Powered Educational Platform

An advanced educational platform that transforms document processing and learning content generation through intelligent analysis. The system creates personalized learning experiences by leveraging cutting-edge AI technologies for comprehensive document interpretation and user engagement.

## Features

- React.js frontend with TypeScript
- Express.js backend
- PostgreSQL database
- OpenAI API integration
- Advanced AI-driven PDF parsing
- Multi-role authentication system
- Scalable document processing infrastructure
- Pacing guide wizard with lesson plan generation
- Dynamic date-based lesson plan assignment
- Streamlined course creation workflow

## Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
OPENAI_API_KEY=your_openai_api_key
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Push database schema:
   ```bash
   npm run db:push
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

## Development

- Frontend code is in the `client/src` directory
- Backend code is in the `server` directory
- Database schema is in `db/schema.ts`

## License

MIT