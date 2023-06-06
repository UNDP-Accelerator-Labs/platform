const { spawn } = require('child_process')
const { fixed_uuid } = include('config/');

module.exports = (req, res) => {
    const { uuid } = fixed_uuid ? { uuid: fixed_uuid } : req.session || {};
    if (!uuid) {
        return res.status(401).json({
            message: 'must be logged in',
        });
    }
    const { query } = req.body || {};
    const proc = spawn('sh/runpy.sh', ['py.location', '-']);
    proc.stdin.write(query);
    proc.stdin.end();
    let resp = '';
    let errs = '';
    proc.stdout.on('data', data => {
        resp = `${resp}${data}`;
    });
    proc.stderr.on('data', data => {
        errs = `${errs}${data}`;
    });
    proc.on('exit', code => {
        if (code || !resp) {
            res.status(400).json({
                message: `error in py.location (${code}) stdout: ${resp} stderr: ${errs}`,
            });
        } else {
            if (errs) {
                console.log(`error in py.location despite success stdout: ${resp} stderr: ${errs}`);
            }
            res.set('Content-Type', 'application/json');
            res.status(200).send(resp);
        }
    })
}
