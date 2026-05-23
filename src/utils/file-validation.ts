import { access, constants, stat } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function validateReadOnlyAccess(
  filePath: string,
  allowedExtensions: string[]
): Promise<string> {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Allowed extensions: ${allowedExtensions.join(", ")}`
    );
  }

  try {
    await access(resolved, constants.R_OK);
  } catch {
    throw new Error(`File not found or not readable: ${resolved}`);
  }

  const stats = await stat(resolved);

  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${resolved}`);
  }

  if (stats.size > MAX_FILE_SIZE_BYTES) {
    const mb = (stats.size / 1024 / 1024).toFixed(1);
    throw new Error(`File too large: ${mb} MB (limit: ${MAX_FILE_SIZE_MB} MB)`);
  }

  return resolved;
}
