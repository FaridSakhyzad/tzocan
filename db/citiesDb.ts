import { Paths, File, Directory } from "expo-file-system";
import { Asset } from "expo-asset";
import * as SQLite from "expo-sqlite";

const DB_NAME = "cities.db";

const SQLITE_DIR = Paths.document.uri + "SQLite/";
const DB_PATH = SQLITE_DIR + DB_NAME;

export async function ensureCitiesDb(): Promise<void> {
  const sqliteDir = new Directory(SQLITE_DIR);

  if (!sqliteDir.exists) {
    await sqliteDir.create();
  }

  const dbFile = new File(DB_PATH);

  if (dbFile.exists) {
    return;
  }

  const asset = Asset.fromModule(require("../assets/db/cities.db"));

  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error("cities.db asset has no localUri");
  }

  const sourceFile = new File(asset.localUri);

  await sourceFile.copy(dbFile);
}

export function openCitiesDb() {
  // expo-sqlite ищет БД по имени в стандартной SQLite папке
  return SQLite.openDatabaseSync(DB_NAME);
}
