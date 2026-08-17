# play-deploy

Uploads the signed `.aab` (built via `bubblewrap build` in `../android-twa/`)
to the Play Console **internal testing track** using the Play Developer API.
Not part of the product — kept out of `client`/`server` deliberately.

## One-time setup (do this once, in the Play Console)

Google requires the very first app entry and first release to be created
manually — the API can't originate a brand-new, never-published package:

1. In Play Console, create the app (`cloud.dafsolt.school`), fill in the
   Store Listing using `../android-twa/store-listing/` (screenshots,
   feature-graphic.png, copy from listing-copy.md), and enroll in **Play
   App Signing** when prompted (recommended default).
2. Upload `../android-twa/app-release-bundle.aab` once, manually, to the
   internal testing track, and complete that first release.
3. Under Setup > API access, create (or link) a Google Cloud service
   account, then under Users and permissions grant it access to this app
   with release permissions on at least the internal testing track.
   Download its JSON key.

## Every release after that

```
cp .env.example .env        # fill in the real values
# put the service-account JSON at the path GOOGLE_APPLICATION_CREDENTIALS points to
npm install
npm run publish
```

This always targets the `internal` track — promoting a build to
production is a separate, deliberate action, not something this script
does automatically.
