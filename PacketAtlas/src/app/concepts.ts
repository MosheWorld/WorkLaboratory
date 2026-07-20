export const CONCEPTS: Array<[string, string, string[], string]> = [
  [
    'Addressing & sockets',
    'The IP locates a host interface. The port locates a transport endpoint.',
    [
      'Name: relay.example',
      'DNS answer: 198.51.100.40',
      'Server socket: TCP :443',
      'Accepted connection: local + remote tuple',
    ],
    'A TCP connection is identified by source IP, source port, destination IP and destination port, within the TCP protocol namespace. A server can accept many connections on port 443 because the remote endpoints differ. UDP can bind a socket to a local address and port; a connected UDP socket can also filter by remote endpoint. Typing an IP does not identify a person or an app account. The application server maps its own authenticated user identifiers to sessions.',
  ],
  [
    'NAT & firewall',
    'One public address, multiple independent conversations.',
    [
      'Phone .20:51820 → :62001',
      'Laptop .21:51820 → :62002',
      'Public gateway 203.0.113.10',
      'Reply :62002 → laptop .21:51820',
    ],
    'NAT/PAT records an internal-to-external address and port mapping. Reply translation uses protocol and the mapped address/port; a filtering policy can additionally restrict remote endpoints. A stateful firewall is a separate policy mechanism. NAT is not encryption. Port forwarding is an explicit rule for unsolicited inbound traffic. Carrier-grade NAT adds another translation layer at the ISP. The table above illustrates established mappings; inbound filtering also checks the allowed remote endpoint.',
  ],
  [
    'ARP, Wi-Fi & Ethernet',
    'Your phone does not need the remote server’s MAC address.',
    [
      'Destination outside /24 subnet',
      'ARP: who has gateway 192.168.1.1?',
      'Local frame → gateway MAC',
      'Router creates next-link frame',
    ],
    'The route table chooses a gateway for off-link traffic. ARP resolves the IPv4 next hop to a local-link MAC address. Switches learn MAC-to-port associations; Wi-Fi access points bridge wireless clients onto the local network. Routers remove incoming link framing and forward with a new link header. WPA2/WPA3 protects a Wi-Fi link, not the complete Internet journey. ARP itself has no authentication. The animation uses Ethernet-like local framing and omits radio association and link retransmissions.',
  ],
  [
    'DNS & trust',
    'An address lookup and server authentication solve different problems.',
    [
      'Query relay.example',
      'Caching resolver returns A record',
      'Connect to the returned IP',
      'TLS verifies the server identity',
    ],
    'The selected run uses a gateway-proxied UDP/53 lookup so the DNS exchange stays visible. Many current clients use DNS over HTTPS or TLS instead. DNSSEC authenticates signed DNS data and does not provide confidentiality. Neither DNS encryption nor a DNS answer replaces TLS server authentication. The reserved name relay.example and documentation IPs are deliberate teaching values.',
  ],
  [
    'Routing, BGP & TTL',
    'The destination IP drives forwarding, not the application name.',
    [
      'ISP forwarding table',
      'Peering / transit between ASes',
      'TTL decreases at each router',
      'Relay starts a new IP packet',
    ],
    'BGP exchanges reachability and policy between autonomous systems; forwarding tables select next hops, generally using longest prefix match. IPv4 TTL is reduced by forwarding routers. Exhaustion can cause an ICMP Time Exceeded response. Transit routers do not acknowledge TCP application bytes. Physical cables carry bits, not application sessions. Real paths can be asymmetric and can change; the globe shows aggregated representative hops, not live routing data.',
  ],
  [
    'TCP reliability',
    'The acknowledgment is the next expected byte, not a packet number.',
    [
      'Receive bytes 1-1000',
      'Bytes 1001-2000 missing',
      'Buffer bytes 2001-3000',
      'Retry gap → release ordered stream',
    ],
    'TCP is a byte stream with sequence numbers, cumulative acknowledgments, flow control and congestion control. SYN consumes one sequence number. If an ACK is lost, a later cumulative ACK may cover those bytes; otherwise a timeout can cause retransmission. Duplicate bytes are not delivered twice. The model shows a fixed illustrative timeout and a small flight of payloads. Congestion-window evolution, delayed ACKs, SACK and fast retransmit are not simulated.',
  ],
  [
    'TLS 1.3',
    'A secure client-to-server channel is established above TCP.',
    [
      'ClientHello + ephemeral key share',
      'ServerHello → derive handshake keys',
      'Encrypted certificate / signature / Finished',
      'Client Finished → application traffic keys',
    ],
    'The client checks the server certificate chain and hostname, the handshake signature and the Finished transcript authenticator. Ephemeral key agreement and key derivation produce separate traffic keys. This example illustrates AES-GCM-style authenticated record protection, without computing cryptography. TLS hides payload contents but leaves IP addresses, ports, sizes and timing observable. ClientHello SNI is visible in this example because ECH is not modeled. TLS records and handshake messages need not align with TCP segments.',
  ],
  [
    'TLS versus E2EE',
    'The relay can remove one encryption layer while another remains.',
    [
      'Sender: E2EE(message)',
      'Connection A: TLS A(E2EE(message))',
      'Relay: E2EE(message)',
      'Connection B: TLS B(E2EE(message))',
    ],
    'TLS A authenticates and protects the sender-to-relay channel. TLS B independently protects the relay-to-recipient channel. The relay is an endpoint of both TLS sessions and can unwrap those layers. Application end-to-end encryption keeps message content protected from the relay. It does not hide all metadata. User and device identity verification and key management are separate from a server TLS certificate. This is a generic teaching stack, not a representation of one provider’s private implementation.',
  ],
  [
    'UDP, TURN, DTLS & SRTP',
    'Security, relaying and reliability are separate choices.',
    [
      'TURN allocation + channel binding',
      'TURN ChannelData carries DTLS',
      'DTLS derives SRTP keys',
      'SRTP media remains end-to-end protected',
    ],
    'UDP has no transport handshake, ordering or retransmission. This fixed relay scenario models a four-byte TURN ChannelData header on each relay leg. Inside it, representative DTLS-SRTP flights establish phone-to-phone keys; subsequent media is protected by SRTP rather than DTLS application-data records. The TURN relay sees allocation metadata but does not decrypt SRTP. Real applications also use ICE path selection, jitter buffers, loss concealment, congestion control and sometimes repair; those algorithms are not simulated.',
  ],
  [
    'Modern alternatives',
    'There is no single stack that every Internet packet uses.',
    [
      'IPv6: global addresses + firewall',
      'QUIC: UDP + integrated TLS 1.3',
      'ICE / STUN: discover connectivity',
      'TURN / relay: alternative media path',
    ],
    'IPv6 commonly uses globally routable addresses and stateful filtering without IPv4-style PAT; Neighbor Discovery replaces ARP and Hop Limit replaces TTL. QUIC runs over UDP and integrates TLS 1.3 with its own reliable streams and loss recovery. It does not become unreliable just because UDP is underneath. ICE considers candidate paths, STUN can discover mapped addresses, and TURN provides relay allocations. Direct and relayed calls are both possible; this scenario intentionally fixes a relay path.',
  ],
];
