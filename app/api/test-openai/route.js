import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'No OpenAI API key configured',
        hasApiKey: false
      });
    }

    console.log('🔑 Testing OpenAI API key...');
    
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('❌ OpenAI API key test failed:', {
        status: testResponse.status,
        error: errorText
      });

      let message = 'OpenAI API key test failed';
      if (testResponse.status === 401) {
        message = 'Invalid OpenAI API key';
      } else if (testResponse.status === 429) {
        message = 'OpenAI API rate limit exceeded';
      } else if (testResponse.status === 402) {
        message = 'OpenAI API quota exceeded';
      }

      return NextResponse.json({
        status: 'error',
        message: `${message} (Status: ${testResponse.status})`,
        hasApiKey: true,
        keyValid: false
      });
    }

    const data = await testResponse.json();
    console.log('✅ OpenAI API key is valid, models available:', data.data?.length || 0);

    return NextResponse.json({
      status: 'success',
      message: 'OpenAI API key is valid',
      hasApiKey: true,
      keyValid: true,
      modelsAvailable: data.data?.length || 0
    });

  } catch (error) {
    console.error('❌ Error testing OpenAI API:', error);
    return NextResponse.json({
      status: 'error',
      message: `Error testing API: ${error.message}`,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      keyValid: false
    }, { status: 500 });
  }
}
