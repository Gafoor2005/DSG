# 📖 Setup Guides

Step-by-step guides for setting up and configuring system components. All guides include verification steps and troubleshooting sections.

## 📋 Available Guides

### ELK Stack (Logging)
| Guide | Description | Difficulty | Time Required |
|-------|-------------|------------|---------------|
| [`elk-stack-guide.md`](./elk-stack-guide.md) | Complete ELK stack setup from scratch | 🔹🔹🔹 | 30 mins |
| [`elk-stack-usage-guide.md`](./elk-stack-usage-guide.md) | How to use ELK for log analysis and monitoring | 🔹🔹 | 15 mins |
| [`kibana-setup-complete.md`](./kibana-setup-complete.md) | Detailed Kibana configuration and dashboard creation | 🔹🔹 | 20 mins |

### Logging & Monitoring
| Guide | Description | Difficulty | Time Required |
|-------|-------------|------------|---------------|
| [`logging-guide.md`](./logging-guide.md) | Winston logging configuration for microservices | 🔹🔹 | 15 mins |
| [`monitoring-setup.md`](./monitoring-setup.md) | Prometheus & Grafana monitoring setup | 🔹🔹🔹 | 25 mins |

## 🎯 Quick Setup Order

### For New Developers
1. **Start here**: [`logging-guide.md`](./logging-guide.md) - Basic logging setup
2. **Then**: [`elk-stack-guide.md`](./elk-stack-guide.md) - Centralized logging
3. **Configure**: [`kibana-setup-complete.md`](./kibana-setup-complete.md) - Log visualization
4. **Monitor**: [`monitoring-setup.md`](./monitoring-setup.md) - System monitoring

### For Production Setup
1. **Monitoring first**: [`monitoring-setup.md`](./monitoring-setup.md)
2. **Logging**: [`elk-stack-guide.md`](./elk-stack-guide.md)
3. **Dashboards**: [`kibana-setup-complete.md`](./kibana-setup-complete.md)
4. **Fine-tuning**: [`elk-stack-usage-guide.md`](./elk-stack-usage-guide.md)

## ✅ Verification Checklist

After following all guides, you should have:
- [ ] Structured logging in all services
- [ ] Logs flowing to Elasticsearch
- [ ] Kibana dashboards configured
- [ ] Prometheus metrics collection
- [ ] Grafana monitoring dashboards
- [ ] Health checks for all components

## 🆘 Common Issues

### ELK Stack
- **Kibana not loading**: Check Elasticsearch health first
- **No logs appearing**: Verify Winston configuration
- **Performance issues**: Review index patterns and time ranges

### Monitoring
- **Metrics not appearing**: Check Prometheus targets
- **Grafana dashboards empty**: Verify data source configuration
- **High resource usage**: Review retention policies

## 📞 Getting Help

1. **Check troubleshooting sections** in each guide
2. **Verify prerequisites** are met
3. **Check service logs** using `docker-compose logs [service]`
4. **Review configuration files** for typos

---

**Difficulty Legend:**  
🔹 = Easy (Basic configuration)  
🔹🔹 = Medium (Some technical knowledge required)  
🔹🔹🔹 = Advanced (In-depth understanding needed)

**Last Updated**: July 6, 2025
