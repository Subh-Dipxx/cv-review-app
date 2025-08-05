import { NextResponse } from "next/server";
import parsePdf from "../../lib/pdf-parser";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results = [];
    for (const file of files) {
      try {
        // Validate file type
        if (file.type !== "application/pdf") {
          results.push({
            fileName: file.name,
            text: `Invalid file type: ${file.name}. Only PDF files are allowed.`,
          });
          continue;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          results.push({
            fileName: file.name,
            text: `File too large: ${file.name}. Maximum size is 5MB.`,
          });
          continue;
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Use the wrapper instead of direct pdf-parse
        const data = await parsePdf(buffer);

        if (!data || !data.text || data.text.trim().length === 0) {
          results.push({
            fileName: file.name,
            text: `No text could be extracted from ${file.name}.`,
          });
        } else {
          results.push({
            fileName: file.name,
            text: data.text,
          });
        }
      } catch (err) {
        results.push({
          fileName: file.name,
          text: `Error processing ${file.name}: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process PDFs: ${error.message}` },
      { status: 500 }
    );
  }
}