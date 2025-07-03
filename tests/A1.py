import asyncio
import aiohttp
import requests
import matplotlib.pyplot as plt
import os
from collections import defaultdict

LOADBALANCER_URL = "http://localhost:5000"
TARGET_REPLICAS = 3
TOTAL_REQUESTS = 10000
HOME_ENDPOINT = f"{LOADBALANCER_URL}/home"
GET_REPLICA_ENDPOINT = f"{LOADBALANCER_URL}/rep"
ADD_REPLICA_ENDPOINT = f"{LOADBALANCER_URL}/add"
REMOVE_REPLICA_ENDPOINT = f"{LOADBALANCER_URL}/rm"
IMG_PATH = "./img/A-1.png"


def ensure_3_replicas():
    """Ensure there are exactly 3 replicas running."""
    try:
        res = requests.get(GET_REPLICA_ENDPOINT)
        res.raise_for_status()
        data = res.json()
        current_replicas = data.get("n")

        if current_replicas != TARGET_REPLICAS:
            diff = abs(TARGET_REPLICAS - current_replicas)
            print(f"Adjusting replicas from {current_replicas} to {TARGET_REPLICAS}...")
            if current_replicas < TARGET_REPLICAS:
                payload = {"replicas": diff, "hostnames": []}
                res = requests.post(ADD_REPLICA_ENDPOINT, json=payload)
                res.raise_for_status()
                print("Replicas adjusted.")
            else:
                payload = {"replicas": diff, "hostnames": []}
                res = requests.delete(REMOVE_REPLICA_ENDPOINT, json=payload)
                res.raise_for_status()
                print("Replicas adjusted.")
    except Exception as e:
        print(f"Error ensuring replicas: {e}")
        exit(1)


async def fetch(session, url, server_count):
    """Send one request to the /home endpoint and extract server ID."""
    try:
        async with session.get(url) as response:
            data = await response.json()
            server_id = data.get("message", "").split(":")[-1].strip()
            return server_id
    except Exception as e:
        return "error"


async def run_load_test():
    """Run 10,000 concurrent requests to /home and count responses by server ID."""
    counts = defaultdict(int)
    connector = aiohttp.TCPConnector(limit=1000)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch(session, HOME_ENDPOINT, TARGET_REPLICAS) for _ in range(TOTAL_REQUESTS)]
        for i, result in enumerate(await asyncio.gather(*tasks)):
            counts[result] += 1
            if (i + 1) % 1000 == 0:
                print(f"Progress: {i + 1}/{TOTAL_REQUESTS} requests sent.")
    return counts


def plot_results(counts):
    """Generate a bar chart of requests handled per server."""
    os.makedirs("img", exist_ok=True)
    labels = list(counts.keys())
    values = [counts[k] for k in labels]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(labels, values, color="skyblue")
    plt.xlabel("Server ID")
    plt.ylabel("Number of Requests Handled")
    plt.title(f"Load Distribution Across {TARGET_REPLICAS} Servers")
    plt.grid(axis="y", linestyle="--", alpha=0.7)

    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2.0, yval + 50, f'{yval}', ha='center', va='bottom')

    plt.tight_layout()
    plt.savefig(IMG_PATH)
    print(f"Chart saved to {IMG_PATH}")


def main():
    ensure_3_replicas()
    print("Launching 10,000 async requests...")
    counts = asyncio.run(run_load_test())
    print("Load test complete. Generating chart...")
    plot_results(counts)


if __name__ == "__main__":
    main()
