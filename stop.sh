if [ -e last.pid ]
then
    kill $(cat last.pid)
    rm last.pid
fi
