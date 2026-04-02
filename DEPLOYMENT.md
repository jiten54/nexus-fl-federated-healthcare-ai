# NEXUS-FL Production Deployment Configuration

## Dockerfile (Aggregator/Backend)
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Kubernetes Manifest (k8s.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexus-fl-aggregator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexus-fl
  template:
    metadata:
      labels:
        app: nexus-fl
    spec:
      containers:
      - name: aggregator
        image: nexus-fl-aggregator:latest
        ports:
        - containerPort: 3000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: nexus-secrets
              key: gemini-api-key
---
apiVersion: v1
kind: Service
metadata:
  name: nexus-fl-service
spec:
  selector:
    app: nexus-fl
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## Flower Node (Python Reference)
```python
import flwr as fl
import torch
import torch.nn as nn

class SimpleModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(784, 10)
    def forward(self, x):
        return self.fc(x)

# Flower Client
class NexusClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        return [val.cpu().numpy() for _, val in model.state_dict().items()]
    def fit(self, parameters, config):
        # Local training logic here
        return self.get_parameters(config), len(train_loader), {}

fl.client.start_numpy_client(server_address="aggregator:8080", client=NexusClient())
```
