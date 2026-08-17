import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { google } from "googleapis";

const packageName = requireEnv("ANDROID_PACKAGE_NAME");
const aabPath = resolve(process.cwd(), requireEnv("AAB_PATH"));
const track = process.env.TRACK ?? "internal";

if (track === "production") {
  throw new Error(
    "Refusing to publish straight to the production track — promote from internal/closed testing " +
      "via the Play Console (or a separate, explicit script) once you've actually tested a build."
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name} (see .env.example)`);
  return value;
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const androidpublisher = google.androidpublisher({ version: "v3", auth });

  console.log(`Opening an edit for ${packageName}...`);
  const { data: edit } = await androidpublisher.edits.insert({ packageName });
  const editId = edit.id!;

  try {
    console.log(`Uploading ${aabPath}...`);
    const { data: bundle } = await androidpublisher.edits.bundles.upload({
      packageName,
      editId,
      media: { mimeType: "application/octet-stream", body: readFileSync(aabPath) },
    });
    console.log(`Uploaded version code ${bundle.versionCode}.`);

    console.log(`Assigning version code ${bundle.versionCode} to the "${track}" track...`);
    await androidpublisher.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: {
        track,
        releases: [{ versionCodes: [String(bundle.versionCode)], status: "completed" }],
      },
    });

    console.log("Committing edit...");
    await androidpublisher.edits.commit({ packageName, editId });

    console.log(`Done — version code ${bundle.versionCode} is live on the "${track}" track.`);
  } catch (err) {
    console.error("Publish failed, discarding the open edit so it doesn't block the next attempt.");
    await androidpublisher.edits.delete({ packageName, editId }).catch(() => {});
    throw err;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
