/** Turns a fetch() Response body into an async stream of {event, data} objects. */
export async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        const raw = line.substring(6).trim();
        if (raw && raw !== '{}') {
          try {
            yield { event: currentEvent, data: JSON.parse(raw) };
          } catch {
            /* ignore partial JSON */
          }
        }
      }
    }
  }
}
