import flwr as fl
import torch
import torch.nn as nn
import torch.optim as optim
from collections import OrderedDict

from pneumonia_model import PneumoniaCNN, get_model_weights, set_model_weights

# --- FLOWER CLIENT ---
class HospitalClient(fl.client.NumPyClient):
    def __init__(self, node_id, hospital_type):
        self.model = PneumoniaCNN()
        self.node_id = node_id
        self.hospital_type = hospital_type # e.g., 'Radiology', 'Critical Care'

    def get_parameters(self, config):
        return get_model_weights(self.model)

    def set_parameters(self, parameters):
        set_model_weights(self.model, parameters)

    def fit(self, parameters, config):
        print(f"NODE_UPDATE: id={self.node_id}, status=training, type={self.hospital_type}")
        self.set_parameters(parameters)
        # Simulate local training
        loss = 0.5 * (1.0 / (1.0 + (id(self) % 10) / 10.0))
        print(f"NODE_UPDATE: id={self.node_id}, status=idle, loss={loss:.4f}, contribution=1.0")
        return self.get_parameters(config), 100, {}

    def evaluate(self, parameters, config):
        print(f"NODE_UPDATE: id={self.node_id}, status=evaluating")
        self.set_parameters(parameters)
        # Simulate evaluation
        loss = 0.5 * (1.0 / (1.0 + (id(self) % 10) / 10.0))
        accuracy = 0.8 + ((id(self) % 10) / 100.0)
        return float(loss), 100, {"accuracy": float(accuracy)}

# Start Client
if __name__ == "__main__":
    import sys
    node_id = sys.argv[1] if len(sys.argv) > 1 else "NODE-01"
    hospital_type = sys.argv[2] if len(sys.argv) > 2 else "Radiology"
    
    print(f"🚀 Starting Hospital Client: {node_id} ({hospital_type})")
    fl.client.start_numpy_client(server_address="127.0.0.1:8080", client=HospitalClient(node_id, hospital_type))
