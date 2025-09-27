import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file.')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Upload file to Supabase storage
export async function uploadFileToSupabase(file, fileName, userId) {
  try {
    console.log(`Uploading file: ${fileName} to Supabase storage for user: ${userId}`)
    
    // Create a unique path for the file
    const filePath = `cvs/${userId}/${Date.now()}_${fileName}`
    
    const { data, error } = await supabase.storage
      .from('cv-files')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw error
    }

    console.log(`File uploaded successfully to: ${data.path}`)
    return {
      filePath: data.path,
      publicUrl: supabase.storage.from('cv-files').getPublicUrl(data.path).data.publicUrl
    }
  } catch (error) {
    console.error('Error uploading to Supabase:', error)
    throw error
  }
}

// Download file from Supabase storage
export async function downloadFileFromSupabase(filePath) {
  try {
    console.log(`Downloading file from Supabase: ${filePath}`)
    
    const { data, error } = await supabase.storage
      .from('cv-files')
      .download(filePath)

    if (error) {
      console.error('Supabase download error:', error)
      throw error
    }

    console.log(`File downloaded successfully, size: ${data.size} bytes`)
    return data
  } catch (error) {
    console.error('Error downloading from Supabase:', error)
    throw error
  }
}

// Delete file from Supabase storage
export async function deleteFileFromSupabase(filePath) {
  try {
    console.log(`Deleting file from Supabase: ${filePath}`)
    
    const { error } = await supabase.storage
      .from('cv-files')
      .remove([filePath])

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

    console.log('File deleted successfully from Supabase')
    return true
  } catch (error) {
    console.error('Error deleting from Supabase:', error)
    throw error
  }
}