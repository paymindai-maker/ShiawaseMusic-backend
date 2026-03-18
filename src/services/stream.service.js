import { spawn } from 'node:child_process';

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function makeError(statusCode, code, message, details = '') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
}

function classifyYtDlpError(stderr = '', stdout = '') {
  const text = `${stderr}\n${stdout}`.toLowerCase();

  if (text.includes('http error 429') || text.includes('too many requests')) {
    return makeError(
      503,
      'YOUTUBE_RATE_LIMITED',
      'YouTube rate-limited stream resolution',
      stderr || stdout
    );
  }

  if (
    text.includes("sign in to confirm you’re not a bot") ||
    text.includes("sign in to confirm you're not a bot") ||
    text.includes('captcha') ||
    text.includes('not a bot')
  ) {
    return makeError(
      503,
      'YOUTUBE_BOT_CHALLENGE',
      'YouTube blocked stream resolution with a bot challenge',
      stderr || stdout
    );
  }

  if (
    text.includes('no supported javascript runtime could be found') ||
    text.includes('--js-runtimes')
  ) {
    return makeError(
      500,
      'YTDLP_JS_RUNTIME_MISSING',
      'yt-dlp JavaScript runtime is not configured correctly',
      stderr || stdout
    );
  }

  return makeError(
    502,
    'STREAM_RESOLVE_FAILED',
    'Failed to resolve stream',
    stderr || stdout
  );
}

function buildYtDlpArgs(videoId) {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--skip-download',
    '--format',
    'bestaudio[ext=m4a]/bestaudio',
    '--get-url',
    '--js-runtimes',
    process.env.YTDLP_JS_RUNTIMES || 'node',
  ];

  if (process.env.YTDLP_COOKIES_FILE) {
    args.push('--cookies', process.env.YTDLP_COOKIES_FILE);
  }

  if (process.env.YTDLP_USER_AGENT) {
    args.push('--user-agent', process.env.YTDLP_USER_AGENT);
  }

  args.push(`https://www.youtube.com/watch?v=${videoId}`);
  return args;
}

function runYtDlp(args, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const bin = process.env.YTDLP_BIN || 'yt-dlp';
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        makeError(
          500,
          'YTDLP_EXEC_FAILED',
          'yt-dlp process failed to start',
          error.message
        )
      );
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        return reject(
          makeError(
            504,
            'YTDLP_TIMEOUT',
            'Timed out while resolving stream',
            stderr || stdout
          )
        );
      }

      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

export async function resolveStream(videoId) {
  if (!YOUTUBE_ID_REGEX.test(videoId)) {
    throw makeError(400, 'BAD_VIDEO_ID', 'Invalid YouTube video id');
  }

  const { exitCode, stdout, stderr } = await runYtDlp(buildYtDlpArgs(videoId));

  const url = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (exitCode !== 0 || !url) {
    throw classifyYtDlpError(stderr, stdout);
  }

  return { url };
}