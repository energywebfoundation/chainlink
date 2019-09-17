import { getDb } from '../database'

if (process.env.NODE_ENV !== 'test') {
  throw Error(
    'trying to load test database in a non test db environment is not supported!',
  )
}

export const clearDb = async () => {
  const db = await getDb()
  if (db) {
    await db.query(`TRUNCATE TABLE admin, chainlink_node CASCADE`)
  }
}
