=== MacBook SSH Setup for OmniChat VM ===

Server: maxnetplus@103.217.144.111

1. Save the private key (id_ed25519) to ~/.ssh/id_ed25519
2. Save the SSH config to ~/.ssh/config
3. Set permissions:
   chmod 600 ~/.ssh/id_ed25519
   chmod 600 ~/.ssh/config
4. Test connection:
   ssh omnichat-vm

The public key is already installed on the server.
