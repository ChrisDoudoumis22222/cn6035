import * as FileSystem from "expo-file-system"

// React Native compatible file validator
export interface FileValidationResult {
  isValid: boolean
  error?: string
  errorMessage?: string
}

export interface FileValidationOptions {
  maxSizeBytes?: number
  allowedMimeTypes?: string[]
  allowedExtensions?: string[]
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "application/pdf"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
}

export async function validateFile(
  fileUri: string,
  mimeType: string,
  options: FileValidationOptions = {},
): Promise<FileValidationResult> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri)
    if (!fileInfo.exists) {
      return {
        isValid: false,
        error: "FILE_NOT_FOUND",
        errorMessage: "File does not exist",
      }
    }

    // Check file size
    if (opts.maxSizeBytes && fileInfo.size && fileInfo.size > opts.maxSizeBytes) {
      const maxSizeMB = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1)
      return {
        isValid: false,
        error: "FILE_TOO_LARGE",
        errorMessage: `File size exceeds ${maxSizeMB}MB limit`,
      }
    }

    // Check MIME type
    if (opts.allowedMimeTypes && !opts.allowedMimeTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: "INVALID_MIME_TYPE",
        errorMessage: `File type ${mimeType} is not allowed`,
      }
    }

    // Check file extension
    if (opts.allowedExtensions) {
      const fileExtension = getFileExtension(fileUri).toLowerCase()
      const isExtensionAllowed = opts.allowedExtensions.some((ext) => ext.toLowerCase() === fileExtension)

      if (!isExtensionAllowed) {
        return {
          isValid: false,
          error: "INVALID_EXTENSION",
          errorMessage: `File extension ${fileExtension} is not allowed`,
        }
      }
    }

    // Basic file header validation for images (simplified for React Native)
    if (mimeType.startsWith("image/")) {
      const isValidImage = await validateImageFile(fileUri, mimeType)
      if (!isValidImage) {
        return {
          isValid: false,
          error: "INVALID_IMAGE",
          errorMessage: "File appears to be corrupted or not a valid image",
        }
      }
    }

    // Basic PDF validation (simplified for React Native)
    if (mimeType === "application/pdf") {
      const isValidPdf = await validatePdfFile(fileUri)
      if (!isValidPdf) {
        return {
          isValid: false,
          error: "INVALID_PDF",
          errorMessage: "File appears to be corrupted or not a valid PDF",
        }
      }
    }

    return {
      isValid: true,
    }
  } catch (error: any) {
    console.error("File validation error:", error)
    return {
      isValid: false,
      error: "VALIDATION_ERROR",
      errorMessage: `Validation failed: ${error.message}`,
    }
  }
}

function getFileExtension(fileUri: string): string {
  const lastDotIndex = fileUri.lastIndexOf(".")
  return lastDotIndex !== -1 ? fileUri.substring(lastDotIndex) : ""
}

// React Native compatible base64 to bytes conversion
function base64ToBytes(base64: string): number[] {
  try {
    // Use atob if available (web), otherwise use a simple fallback
    let binary: string

    if (typeof atob !== "undefined") {
      binary = atob(base64)
    } else {
      // Simple base64 decode for React Native
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
      let result = ""
      let i = 0

      // Remove any characters not in the base64 alphabet
      base64 = base64.replace(/[^A-Za-z0-9+/]/g, "")

      while (i < base64.length) {
        const encoded1 = chars.indexOf(base64.charAt(i++))
        const encoded2 = chars.indexOf(base64.charAt(i++))
        const encoded3 = chars.indexOf(base64.charAt(i++))
        const encoded4 = chars.indexOf(base64.charAt(i++))

        const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4

        result += String.fromCharCode((bitmap >> 16) & 255)
        if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255)
        if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255)
      }

      binary = result
    }

    const bytes: number[] = []
    for (let i = 0; i < binary.length; i++) {
      bytes.push(binary.charCodeAt(i))
    }
    return bytes
  } catch (error) {
    console.warn("Base64 conversion error:", error)
    // Return a few bytes to avoid breaking the validation
    return [0, 0, 0, 0, 0]
  }
}

async function validateImageFile(fileUri: string, mimeType: string): Promise<boolean> {
  try {
    // Read first few bytes to check file signature
    const fileData = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 100, // Read first 100 bytes
    })

    // Convert base64 to check file signatures
    const bytes = base64ToBytes(fileData)

    // Check common image file signatures
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      // JPEG starts with FF D8 FF
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    }

    if (mimeType === "image/png") {
      // PNG starts with 89 50 4E 47 0D 0A 1A 0A
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    }

    return true // Allow other image types to pass
  } catch (error) {
    console.warn("Image validation error:", error)
    return true // If validation fails, allow the file (fail open)
  }
}

async function validatePdfFile(fileUri: string): Promise<boolean> {
  try {
    // Read first few bytes to check PDF signature
    const fileData = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 20, // Read first 20 bytes
    })

    const bytes = base64ToBytes(fileData)

    // PDF starts with %PDF
    const pdfSignature = [0x25, 0x50, 0x44, 0x46] // %PDF
    return (
      bytes[0] === pdfSignature[0] &&
      bytes[1] === pdfSignature[1] &&
      bytes[2] === pdfSignature[2] &&
      bytes[3] === pdfSignature[3]
    )
  } catch (error) {
    console.warn("PDF validation error:", error)
    return true // If validation fails, allow the file (fail open)
  }
}

export function getFileValidationErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    FILE_NOT_FOUND: "The selected file could not be found.",
    FILE_TOO_LARGE: "The file is too large. Please select a smaller file.",
    INVALID_MIME_TYPE: "This file type is not supported. Please select a JPEG, PNG, or PDF file.",
    INVALID_EXTENSION: "This file extension is not allowed.",
    INVALID_IMAGE: "The selected file is not a valid image.",
    INVALID_PDF: "The selected file is not a valid PDF.",
    VALIDATION_ERROR: "An error occurred while validating the file.",
  }

  return errorMessages[error] || "File validation failed."
}

// Validation options for different file types
export const IMAGE_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB for images
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png"],
  allowedExtensions: [".jpg", ".jpeg", ".png"],
}

export const MENU_FILE_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
}
