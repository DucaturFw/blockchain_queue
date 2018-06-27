./stop.sh
nohup yarn ts-node index.ts &> log.txt & echo $! > last.pid

