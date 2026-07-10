async function test() {
  const res = await fetch('http://localhost:3002/api/notifications/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audience: 'SPECIFIC',
      targetPhone: '9855462104',
      title: 'Bot test',
      message: 'Hello from bot'
    })
  });
  const text = await res.text();
  console.log(res.status, text);
}
test();
