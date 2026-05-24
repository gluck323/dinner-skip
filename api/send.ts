export const config = {
  runtime: 'edge',
};

const DEFAULT_MESSAGE = '今日は夕食いらない';
const MAX_CONTENT_LENGTH = 200;
const DISCORD_API = 'https://discord.com/api/v10';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const sharedToken = process.env.SHARED_TOKEN;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const recipientId = process.env.DISCORD_RECIPIENT_USER_ID;

  if (!sharedToken || !botToken || !recipientId) {
    return new Response('server misconfigured', { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${sharedToken}`) {
    return new Response('unauthorized', { status: 401 });
  }

  let content = DEFAULT_MESSAGE;
  try {
    const body = (await req.json().catch(() => ({}))) as { content?: unknown };
    if (typeof body.content === 'string') {
      const trimmed = body.content.trim();
      if (trimmed.length > 0) {
        content = trimmed.slice(0, MAX_CONTENT_LENGTH);
      }
    }
  } catch {
    // body is optional
  }

  // Step 1: Open (or fetch existing) DM channel with the recipient.
  // The same call returns the existing channel if one already exists between bot and user.
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: recipientId }),
  });

  if (!dmRes.ok) {
    const errText = await dmRes.text().catch(() => '');
    return new Response(`failed to open DM channel: ${dmRes.status} ${errText}`, {
      status: 502,
    });
  }

  const dm = (await dmRes.json()) as { id: string };

  // Step 2: Send the message to that DM channel.
  const msgRes = await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!msgRes.ok) {
    const errText = await msgRes.text().catch(() => '');
    return new Response(`failed to send DM: ${msgRes.status} ${errText}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true, content }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
