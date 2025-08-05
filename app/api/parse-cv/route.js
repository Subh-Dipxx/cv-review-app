import { NextResponse } from "next/server";

// Dynamically import pdf-parse to handle potential import issues
let pdfParse;
try {
  pdfParse = require("pdf-parse");
} catch (importError) {
  console.error("Failed to import pdf-parse:", importError.message);
}

export async function POST(request) {
  console.log("Parse CV API called");
  
  try {
    if (!pdfParse) {
      throw new Error("pdf-parse module not available. Please install it with: npm install pdf-parse");
    }

    const formData = await request.formData();
    const files = formData.getAll("files");
    
    console.log(`Received ${files.length} files in formData`);
    
    if (!files || files.length === 0) {
      console.error("No files received in request");
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        // Validate file type
        if (file.type !== "application/pdf") {
          console.warn(`Skipping non-PDF file: ${file.name} (type: ${file.type})`);
          results.push({
            fileName: file.name,
            text: `Skipped: ${file.name} is not a PDF file (type: ${file.type})`,
          });
          continue;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          console.warn(`Skipping large file: ${file.name} (${file.size} bytes)`);
          results.push({
            fileName: file.name,
            text: `Skipped: ${file.name} exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
          });
          continue;
        }

        if (file.size === 0) {
          console.warn(`Skipping empty file: ${file.name}`);
          results.push({
            fileName: file.name,
            text: `Skipped: ${file.name} is empty`,
          });
          continue;
        }

        console.log(`Converting ${file.name} to buffer...`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`Parsing PDF ${file.name} (${buffer.length} bytes)...`);
        
        try {
          const data = await pdfParse(buffer, {
            max: 0, // No page limit
          });
          
          if (!data || !data.text || data.text.trim().length === 0) {
            console.warn(`No text extracted from: ${file.name}`);
            results.push({
              fileName: file.name,
              text: `No text could be extracted from ${file.name}. This might be an image-based PDF or encrypted.`,
            });
          } else {
            console.log(`Successfully parsed ${file.name}: ${data.text.length} characters`);
            results.push({
              fileName: file.name,
              text: data.text,
            });
          }
        } catch (parseError) {
          console.error(`PDF parsing failed for ${file.name}:`, parseError.message);
          results.push({
            fileName: file.name,
            text: `PDF parsing failed for ${file.name}: ${parseError.message}. The file might be corrupted or password-protected.`,
          });
        }
        
      } catch (fileError) {
        console.error(`File processing error for ${file.name}:`, fileError.message);
        results.push({
          fileName: file.name,
          text: `File processing error for ${file.name}: ${fileError.message}`,
        });
      }
    }

    console.log(`Parse completed. Processed ${results.length} files`);
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error("Critical error in parse-cv API:", error);
    return NextResponse.json(
      { 
        error: `Server error: ${error.message}`,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}