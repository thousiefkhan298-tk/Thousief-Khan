
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function listUsers() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  const users = await db.all('SELECT email FROM users');
  console.log('Users in database:', users);
  await db.close();
}

listUsers();
