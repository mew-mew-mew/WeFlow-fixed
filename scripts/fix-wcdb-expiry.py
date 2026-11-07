"""Reproduce the Windows x64 5.0.0 expiry repair for one verified DLL build."""
import argparse
import datetime
import hashlib
import pathlib
import struct

ORIGINAL_SHA256 = '6397760da70de8062829fbe6a2ec01cf0616d6f2b334e6fe54873898f38f7ad7'
REPAIRED_SHA256 = '74c96063fe619a84c9ab665c7d7d4fcf4ea1def866ea5197b407983a858bf175'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path,
                        help='Write a new file; never overwrite the source or an existing output.')
    args = parser.parse_args()
    raw = args.source.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest == REPAIRED_SHA256:
        raise SystemExit('The source is already repaired; no changes made.')
    if digest != ORIGINAL_SHA256:
        raise SystemExit('Unknown DLL SHA-256; stopped without changing any file.')
    if args.source.resolve() == args.output.resolve():
        raise SystemExit('Source and output must be different files.')
    if raw[0x80dbf:0x80dc7] != bytes.fromhex('483d7fa2bd6a7e0a'):
        raise SystemExit('InitProtection instruction check failed.')
    if raw[0xe8589:0xe8591] != bytes.fromhex('c744246c7e000000'):
        raise SystemExit('wcdb_init instruction check failed.')
    expiry = int(datetime.datetime(2037, 9, 30, 23, 59, 59,
                                  tzinfo=datetime.timezone.utc).timestamp())
    patched = bytearray(raw)
    patched[0x80dc1:0x80dc5] = struct.pack('<I', expiry)
    patched[0xe858d:0xe8591] = struct.pack('<I', 137)
    if hashlib.sha256(patched).hexdigest() != REPAIRED_SHA256:
        raise SystemExit('Repaired SHA-256 check failed.')
    with args.output.open('xb') as stream:
        stream.write(patched)
    print('Created repaired component. SHA-256: ' + REPAIRED_SHA256)


if __name__ == '__main__':
    main()
