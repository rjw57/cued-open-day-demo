#!/usr/bin/env python
"""
Usage:
    analyse.py [options] <output> <componentdir> <image>...

Options:
    -h, --help              Print a brief usage summary.

<componentdir> should have a mean.png and component_XXXX.png files (starting
from 0001). Each image is resolved onto the mean and component images and
written to the JSON file at <output>.

"""
import glob
import json
import logging
import os

import docopt
import numpy as np
from PIL import Image

def load_components(dirname):
    mu = np.asarray(
        Image.open(os.path.join(dirname, 'mean.png')).convert('RGBA')
    )
    mu = mu.astype(np.float) / 255.0

    cs = []
    while True:
        idx = len(cs) + 1
        component_fn = os.path.join(dirname, 'component_{0:04d}.png'.format(idx))
        if not os.path.exists(component_fn):
            break
        c_im = np.asarray(Image.open(component_fn).convert('RGBA'))
        c_im = c_im.astype(np.float)
        c_im /= 255.0
        c_im[..., :3] -= 0.5
        c_im[..., :3] *= 2
        cs.append(c_im)

    return mu, cs

def resolve(im, component):
    valid = np.logical_and(im[..., 3] > 0.5, component[..., 3] > 0.5)
    valid = np.repeat(valid[..., np.newaxis], 3, 2)
    I = im[..., :3][valid]
    C = component[..., :3][valid]
    Ilen = np.sqrt(np.sum(I*I))
    Clen = np.sqrt(np.sum(C*C))
    a = np.sum(I * C) / (Clen * Clen)
    I -= C * a
    residual = np.copy(im)
    residual[..., :3][valid] = I
    return a, residual

def main():
    opts = docopt.docopt(__doc__)
    logging.basicConfig(level=logging.INFO)
    im_fns = opts['<image>']

    logging.info('Loading components...')
    mu, cs = load_components(opts['<componentdir>'])
    if len(cs) == 0:
        logging.error('No components')
        return

    logging.info('Processing {0} images...'.format(len(im_fns)))
    records = []
    for im_fn in im_fns:
        logging.info('Processing %s', im_fn)
        im = Image.open(im_fn).convert('RGBA')
        im = im.resize((mu.shape[1], mu.shape[0]))
        im = np.asarray(im).astype(np.float) / 255.0

        # resolve onto mean
        mu_val, _ = resolve(im, mu)
        #mu_val = 1
        im[..., :3] -= mu_val * mu[..., :3]
        c_vals = []

        recon = mu_val * mu
        for c in cs:
            cv, _ = resolve(im, c)
            recon += cv * c
            #im[..., :3] -= (cv * c)[..., :3]
            c_vals.append(cv)

        recon[..., 3] = mu[..., 3]
        recon = np.clip(recon, 0, 1)
        #Image.fromarray((recon*255).astype(np.uint8)).save(os.path.basename(im_fn))

        n = os.path.basename(im_fn)
        n = 'img/' + n[:-len('_XX_XX.png')] + '.JPEG' # HACK!
        records.append(dict(fn=n, mu=mu_val, cs=c_vals))

    with open(opts['<output>'], 'w') as f:
        json.dump(dict(files=records), f)

if __name__ == '__main__':
    main()
