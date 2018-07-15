./stop.sh

rm -rf log_*.txt

nohup yarn eth &> log_eth.txt & echo $! > last_eth.pid
nohup yarn eos &> log_eos.txt & echo $! > last_eos.pid
nohup yarn neo &> log_neo.txt & echo $! > last_neo.pid

nohup yarn api &> log_api.txt & echo $! > last_api.pid
