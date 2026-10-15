import Database from "better-sqlite3";
import {app} from 'electron';
import path from 'path';

const dbPath = path.join(app.getPath('userData'), 'mydatabase.db');
const db = new Database(dbPath);

export default db;