./stop.sh
nohup yarn eth &> log_eth.txt & echo $! > last_eth.pid
nohup yarn eos &> log_eos.txt & echo $! > last_eos.pid

nohup yarn api &> log_api.txt & echo $! > last_api.pid
