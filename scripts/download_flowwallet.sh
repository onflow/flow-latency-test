#!/bin/bash

# Fetch the latest release info from GitHub
# release_json=$(curl -s https://api.github.com/repos/onflow/FRW-extension/releases/latest)
# Fetch a specific release
release_json=$(curl -s https://api.github.com/repos/onflow/FRW-extension/releases/tags/2.8.6)

# Find the asset with a name starting with 'Flow_Wallet_'
download_url=$(echo "$release_json" | jq -r '.assets[] | select(.name | startswith("Flow_Wallet_")) | .browser_download_url')

if [ -z "$download_url" ]; then
  echo "No asset found with name starting with 'Flow_Wallet_'"
  exit 1
fi

echo "Download URL: $download_url"

# Download the zip file
zip_name="flowwallet-chrome.zip"
curl -L -o "$zip_name" "$download_url"

# Extract to extensions/metamask directory
target_dir="extensions/flow-wallet"
rm -rf "$target_dir"
mkdir -p "$target_dir"
unzip -q "$zip_name" -d "$target_dir"

# Clean up the zip file
rm "$zip_name"

echo "Flow Wallet extension downloaded and extracted to $target_dir"
