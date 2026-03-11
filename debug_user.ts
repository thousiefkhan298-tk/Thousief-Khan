
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function debugUser() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  const user = await db.get('SELECT * FROM users WHERE email = ?', ['speedfit029@gmail.com']);
  console.log('User found:', user);
  await db.close();
}

debugUser();
