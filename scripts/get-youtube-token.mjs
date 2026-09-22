// One-time, run locally: npm run youtube:auth
// Prints the refresh token you paste into the YOUTUBE_REFRESH_TOKEN GitHub secret.
import http from "node:http";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPES = [
  // force-ssl (not just upload/readonly) so the pipeline can also delete a bad
  // upload or manage the video later, not just create new ones.
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first.\n" +
      'PowerShell:  $env:YOUTUBE_CLIENT_ID="..."; $env:YOUTUBE_CLIENT_SECRET="..."',
  );
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const url = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces a refresh_token even if you have authorized before
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("No code in callback.");
    return;
  }
  try {
    const { tokens } = await oauth.getToken(code);
    res.writeHead(200, { "content-type": "text/plain" }).end(
      "Done. Return to your terminal for the refresh token.",
    );
    if (!tokens.refresh_token) {
      console.error("\nGoogle returned no refresh token. Revoke the app at");
      console.error("https://myaccount.google.com/permissions and run this again.");
    } else {
      oauth.setCredentials(tokens);
      const yt = google.youtube({ version: "v3", auth: oauth });
      const ch = await yt.channels.list({ part: ["snippet"], mine: true });
      const channelTitle = ch.data.items?.[0]?.snippet?.title ?? "(unknown - could not resolve channel)";

      console.log(`\nThis token is authorized for channel: "${channelTitle}"`);
      console.log("If that's the wrong channel, don't save this token - run again and pick the right one.\n");
      console.log("YOUTUBE_REFRESH_TOKEN=");
      console.log(tokens.refresh_token);
      console.log("\nAdd it as a GitHub repo secret. It does not expire unless you revoke it.");
    }
  } catch (err) {
    res.writeHead(500).end("Token exchange failed.");
    console.error(err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("Open this URL, pick the channel's Google account, and approve:\n");
  console.log(url);
  console.log(`\nWaiting on ${REDIRECT} ...`);
});
