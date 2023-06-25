import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function FetchDialog({open, onSubmit, onCancel}) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleClose = (event) => {
    console.log(event)
    if (event.target.id === 'fetch-btn') {
      onSubmit(searchTerm)
    } else {
      onCancel()
    }
  };

  const handleChange = (event) => {
    const text = event.target.value;
    setSearchTerm(text);
  }

  return (
    <div>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Fetch Confluence Pages</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a search term to find matching Confluence pages
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Search term"
            fullWidth
            variant="outlined"
            onChange={handleChange}
            value={searchTerm}
          />
        </DialogContent>
        <DialogActions>
          <Button id='cancel-btn' onClick={handleClose}>Cancel</Button>
          <Button id='fetch-btn' onClick={handleClose}>Fetch</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}