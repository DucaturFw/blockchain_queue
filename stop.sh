if [ -e last_eth.pid ]
then
    kill $(cat last_eth.pid)
    rm last_eth.pid
    echo "killed ETH"
fi

if [ -e last_eos.pid ]
then
    kill $(cat last_eos.pid)
    rm last_eos.pid
    echo "killed EOS"
fi

if [ -e last_api.pid ]
then
    kill $(cat last_api.pid)
    rm last_api.pid
    echo "killed api"
fi
