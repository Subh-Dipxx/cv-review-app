# CV Review App

An AI-powered CV categorization and analysis tool built with Next.js, MySQL, and PDF parsing capabilities.

## Features

- Upload multiple PDF files (up to 10, max 5MB each)
- Automatic CV categorization (QA Engineer, BA Engineer, Software Developer, etc.)
- Extract and summarize CV content
- Store results in MySQL database
- Responsive design with drag-and-drop interface

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **PDF Processing**: pdf-parse
- **UI Components**: react-dropzone, react-hot-toast

## Prerequisites

- Node.js 18+ 
- MySQL 5.7+ or 8.0+
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cv-review-app.git
cd cv-review-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cv_review
```

4. Set up MySQL database:
```sql
CREATE DATABASE cv_review CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload CVs**: Drag and drop or click to select PDF files
2. **Process**: Click "Process CVs" to analyze and categorize
3. **View Results**: See categorized CVs with summaries
4. **Database**: All results are automatically saved to MySQL

## API Endpoints

- `POST /api/parse-cv` - Parse PDF files and extract text
- `POST /api/process-cv` - Categorize and analyze CV content
- `GET /api/get-cvs` - Retrieve all processed CVs from database

## Project Structure

```
cv-review-app/
├── app/
│   ├── api/
│   │   ├── parse-cv/route.js
│   │   ├── process-cv/route.js
│   │   └── get-cvs/route.js
│   ├── lib/
│   │   └── db.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Categories

The app automatically categorizes CVs into:
- QA Engineer
- BA Engineer  
- Software Developer
- Project Manager
- Data Analyst
- Designer
- DevOps Engineer
- Certificate/Document
- Incomplete/Short Document
- Other

## Troubleshooting

### Common Issues

1. **"Parse request failed" error**:
   - Ensure `pdf-parse` is installed: `npm install pdf-parse`
   - Check file size limits (max 5MB per file)
   - Verify PDF files are not corrupted or password-protected

2. **Database connection errors**:
   - Verify MySQL is running
   - Check database credentials in `.env.local`
   - Ensure database `cv_review` exists

3. **Module not found errors**:
   - Run `npm install` to install all dependencies
   - Delete `node_modules` and `package-lock.json`, then run `npm install`

### Dependencies

Make sure these packages are installed:
```bash
npm install pdf-parse mysql2 react-dropzone react-hot-toast
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
