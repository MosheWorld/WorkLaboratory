/** Small, accessible diagrams complement the existing concept explanations. */
export const ConceptVisuals = Object.freeze({
  render(index: number) {
    const examples: Array<[string, Array<[string, string]>, string]> = [
      [
        'A connection has two endpoints',
        [
          ['Client socket', '192.168.1.20 : 51820'],
          ['Server socket', '198.51.100.40 : 443'],
          ['Transport namespace', 'TCP'],
        ],
        'An IP selects a host interface; a port selects a transport endpoint. The application identifies the user.',
      ],
      [
        'Watch the address translation',
        [
          ['LAN source', '192.168.1.20 : 51820'],
          ['WAN source', '203.0.113.10 : 62001'],
          ['Reply destination after NAT', '192.168.1.20 : 51820'],
        ],
        'NAT rewrites an address and port. TLS ciphertext survives this translation unchanged.',
      ],
      [
        'Local delivery versus Internet delivery',
        [
          ['Ethernet destination', 'Gateway MAC'],
          ['IPv4 destination', 'Relay IP'],
          ['At the next router', 'New link header'],
        ],
        'The far-away server MAC is never needed by your phone.',
      ],
      [
        'Two different kinds of trust',
        [
          ['DNS answer', 'Where should I connect?'],
          ['TLS certificate checks', 'Is this the expected server?'],
          ['E2EE identity checks', 'Is this the intended peer?'],
        ],
        'A correct address alone does not prove identity.',
      ],
      [
        'A router changes forwarding fields',
        [
          ['Source → destination IP', 'Unchanged at ordinary transit routers'],
          ['TTL example', '64 → 63 → 62'],
          ['Link addresses', 'Replaced on each routed link'],
        ],
        'NAT gateways are an exception: they also rewrite IP addresses and ports.',
      ],
      [
        'Traffic can travel both ways at once',
        [
          ['Client → relay', 'P011: ACK, next byte 7101'],
          ['Relay → client', 'P012: encrypted TLS server flight'],
          ['TCP behavior', 'Full duplex'],
        ],
        'The server can continue sending within its allowed window while an ACK is still traveling. The model uses illustrative timing and separate ACK packets.',
      ],
      [
        'Visibility during TLS 1.3',
        [
          ['Before ServerHello', 'ClientHello and ServerHello visible'],
          ['After key agreement', 'Certificate and Finished encrypted'],
          ['Application data', 'Protected by application traffic keys'],
        ],
        'IP addresses, ports, lengths and timing remain visible outside TLS.',
      ],
      [
        'Two nested encryption layers',
        [
          ['Sender', 'TLS A [ E2EE [ message ] ]'],
          ['Relay', 'E2EE [ message ]'],
          ['Recipient connection', 'TLS B [ E2EE [ message ] ]'],
        ],
        'The relay changes the outer TLS envelope while the inner message remains encrypted for the recipient.',
      ],
      [
        'A modeled media datagram',
        [
          ['IPv4 + UDP', '20 + 8 bytes'],
          ['TURN ChannelData', '4-byte header'],
          ['SRTP-protected packet', '192 modeled bytes'],
        ],
        'Total: 224 modeled IP bytes. DTLS establishes the media keys; subsequent SRTP media is not a TLS record.',
      ],
      [
        'Different stacks, different responsibilities',
        [
          ['IPv4 + TCP + TLS', 'TCP handles ordered reliable delivery'],
          ['IPv4 + UDP + SRTP', 'Media security, no UDP reliability'],
          ['IPv6 + UDP + QUIC', 'QUIC provides reliable streams and TLS security'],
        ],
        'UDP underneath does not mean that protocols built above it cannot provide reliability.',
      ],
    ];
    const [title, rows, caption] = examples[index];
    return `<section class="concept-example"><h3>${title}</h3>${this.diagram(index)}<div class="visual-stack">${rows.map(([label, value], i) => `<div class="visual-row"><span class="visual-number">${i + 1}</span><div><span>${label}</span><strong>${value}</strong></div></div>`).join('')}</div><p>${caption}</p></section>`;
  },
  diagram(index: number) {
    if (index === 5)
      return `<svg class="duplex-diagram" viewBox="0 0 600 180" role="img" aria-label="P011 ACK goes from client to relay while P012 TLS data goes from relay to client"><rect x="10" y="55" width="95" height="80" rx="8" fill="#163d38"/><rect x="495" y="55" width="95" height="80" rx="8" fill="#3b3024"/><g fill="#e9f0f8" font-family="sans-serif" font-size="16" text-anchor="middle"><text x="57" y="100">Client</text><text x="542" y="100">Relay</text><text x="300" y="55">P011 · TCP ACK</text><text x="300" y="148">P012 · Encrypted TLS flight</text></g><path d="M120 75 H478 l-12 -7 m12 7 l-12 7" fill="none" stroke="#83bfff" stroke-width="3"/><path d="M480 115 H122 l12 -7 m-12 7 l12 7" fill="none" stroke="#bda1ff" stroke-width="3"/></svg>`;
    if (index === 7)
      return `<div class="envelope"><span>TLS protection · ends at the relay</span><div class="envelope inner"><span>End-to-end protection · ends at the recipient</span><div class="message-core">Message content</div></div></div>`;
    if (index === 6)
      return `<div class="visibility-band"><span>Visible<br><b>ClientHello + ServerHello</b></span><span>Encrypted handshake<br><b>Certificate + Finished</b></span><span>Encrypted application<br><b>Message records</b></span></div>`;
    if (index === 8)
      return `<div class="byte-strip" aria-label="Modeled IPv4 media packet: 20 bytes IPv4, 8 UDP, 4 TURN and 192 SRTP"><span>IPv4<br><b>20 B</b></span><span>UDP<br><b>8 B</b></span><span>TURN<br><b>4 B</b></span><span>SRTP<br><b>192 B</b></span></div><small>Header blocks are enlarged for readability.</small>`;
    if (index === 1)
      return `<div class="nat-transform"><div><small>Before gateway</small><code>192.168.1.20:51820</code></div><b aria-label="translated to">→</b><div><small>After gateway</small><code>203.0.113.10:62001</code></div></div>`;
    return '';
  },
});
