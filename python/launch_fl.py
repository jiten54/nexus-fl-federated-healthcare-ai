import subprocess
import time
import sys
import os

def launch_fl():
    print("🚀 Launching Nexus-FL System...")
    
    # 1. Start Server
    server_process = subprocess.Popen([sys.executable, "python/nexus_server.py"])
    print("✅ Server started on port 8080")
    
    time.sleep(5) # Wait for server to be ready
    
    # 2. Start Clients (Radiology, Critical Care, Specialized, Academic)
    clients = []
    node_configs = [
        ("HOSPITAL-INDIA-01", "Radiology"),
        ("HOSPITAL-USA-02", "Critical Care"),
        ("HOSPITAL-UK-03", "Specialized"),
        ("HOSPITAL-GERMANY-04", "Academic")
    ]
    for node_id, node_type in node_configs:
        print(f"✅ Starting Client: {node_id} ({node_type})")
        p = subprocess.Popen([sys.executable, "python/nexus_client.py", node_id, node_type])
        clients.append(p)
        time.sleep(1)
        
    print("🌐 Federated Learning Network Active")
    
    try:
        # Wait for server to finish
        server_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        server_process.terminate()
        for p in clients:
            p.terminate()

if __name__ == "__main__":
    launch_fl()
