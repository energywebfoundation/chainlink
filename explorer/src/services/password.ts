import argon2 from 'argon2'

export function hash(plaintext: string): Promise<string> {
  return argon2.hash(plaintext)
}

export async function compare(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  try {
    const valid = await argon2.verify(hash, plaintext)
    return valid
  } catch (e) {
    console.error(e)
    return false
  }
}
