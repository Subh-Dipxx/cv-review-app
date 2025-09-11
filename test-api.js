const fs = require("fs");
const FormData = require("form-data");
const fetch = require("node-fetch");

async function testProcessCV() {
  console.log("Testing /api/process-cv with form data...");
  
  const formData = new FormData();
  
  // Add the test file
  const fileBuffer = fs.readFileSync("./test-data/sample-cv.txt");
  formData.append("files", fileBuffer, { filename: "sample-cv.txt" });
  
  try {
    const response = await fetch("http://localhost:3000/api/process-cv", {
      method: "POST",
      body: formData,
    });
    
    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testProcessCV();
