import * as React from "react";
import { useEffect } from "react";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import CssBaseline from "@mui/material/CssBaseline";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import TreeView from '@mui/lab/TreeView';
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TreeItem from '@mui/lab/TreeItem';import Button from '@mui/material/Button';
import PersonIcon from '@mui/icons-material/Person';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import SendIcon from '@mui/icons-material/Send';
import { TextField } from "@mui/material";
import TextareaAutosize from '@mui/base/TextareaAutosize';
const drawerWidth = 240;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
);

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

const TreeItems = () => {
  const [files, setFiles] = React.useState([]);

  useEffect(() => {
    if (window.api) {
      window.api.response('dialog:filelist', (filelist) => {
        console.log('Reply', filelist);
        setFiles(filelist);
      });  
    }
  },[]);

  const tree = (
    <TreeView
    aria-label="file system navigator"
    defaultCollapseIcon={<ExpandMoreIcon />}
    defaultExpandIcon={<ChevronRightIcon />}
    sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
  >

      {
        files?.map((file, i) => <TreeItem key={file.name+i} nodeId={file.name+i} label={file.name}>
          {
            file.children?.map((child, j) => <TreeItem key={file.name+child.name+j} nodeId={file.name+child.name+j} label={child.name}/>)
          }
        </TreeItem>)
      }
    </TreeView>
  )

  return tree;
}

const Conversation = () => {
  const [lastPrompt, setLastPrompt] = React.useState('');
  const [chatResponse, setChatResponse] = React.useState('');

  useEffect(() => {
    if (window.api) {
      window.api.response('chat:response', (response) => {
        console.log('Reply', response);
        setLastPrompt(response.prompt);
        setChatResponse(response.completion);
      });  
    }
  },[]);  

  return <>
    <LastPrompt prompt={lastPrompt} />
    <ChatResponse response={chatResponse} />
    <Prompt />
  </>
}

const LastPrompt = (props) => {
  let textField = '';

  if (props.prompt) {
    textField = (
    <>
      <PersonIcon style={{ marginTop: '10px'}} />
      <TextField id="last-prompt" label={props.prompt} variant="outlined" sx={{ width: '85%', padding: '5px'}} size="small" disabled/>
      <ModeEditIcon/>
    </>
    )
  }

  return textField;
}

const ChatResponse = (props) => {
  const blue = {
    100: '#DAECFF',
    200: '#b6daff',
    400: '#3399FF',
    500: '#007FFF',
    600: '#0072E5',
    900: '#003A75',
  };

  const grey = {
    50: '#f6f8fa',
    100: '#eaeef2',
    200: '#d0d7de',
    300: '#afb8c1',
    400: '#8c959f',
    500: '#6e7781',
    600: '#57606a',
    700: '#424a53',
    800: '#32383f',
    900: '#24292f',
  };

  const StyledTextarea = styled(TextareaAutosize)(
    ({ theme }) => `
    width: 90%;
    font-family: IBM Plex Sans, sans-serif;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.5;
    padding: 12px;
    border-radius: 12px 12px 0 12px;
    color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
    border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
    box-shadow: 0px 2px 24px ${
      theme.palette.mode === 'dark' ? blue[900] : blue[100]
    };
  
    &:hover {
      border-color: ${blue[400]};
    }
  
    &:focus {
      border-color: ${blue[400]};
      box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? blue[600] : blue[200]};
    }
  
    // firefox
    &:focus-visible {
      outline: 0;
    }
  `,
  );

  return <StyledTextarea style={{height: '90%'}} aria-label="Response" placeholder="Response" defaultValue={props.response} disabled />;
}

const Prompt = () => {
  const [prompt, setPrompt] = React.useState('');

  const handleChange = (event) => {
    const text = event.target.value;
    setPrompt(text);
  }

  const handleSubmit = () => {
    window.api.request('chat:completion', prompt);
    setPrompt('');
  }

  return <>
    <TextField
      id="last-prompt" 
      placeholder="Prompt" 
      variant="outlined"
      onChange={handleChange}
      value={prompt}
      sx={{ width: '85%'}}
      size="small"
    />
    <IconButton variant="contained" onClick={handleSubmit} size="large">
      <SendIcon />
    </IconButton>
  </>
}

const SelectedFolder = () => {
  const [path, setPath] = React.useState('');

  useEffect(() => { 
    if (window.api) {
      window.api.response('dialog:reply', (folderPath) => {
        console.log('Reply', folderPath);
        setPath(folderPath);
      });  
    }
  },[]);

  return <label id="folder-lbl" style={{ margin: '5px 0 0 5px'}}><small>{path || 'Select a content source folder'}</small></label>;
}

export default function Sidebar() {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleSelectFolder = () => {
    if (window.api) {
      window.api.request('dialog:openFolder', '');
    }
  }

  useEffect(() => {
    setOpen(true); 
  },[]);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Personal AI
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <p>Content Sources</p>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === "ltr" ? (
              <ChevronLeftIcon />
            ) : (
              <ChevronRightIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <div style={{display: 'flex', justifyContent: 'center', marginTop: '5px'}}>
          <Button 
            id="folder-btn" 
            variant="contained" 
            style={{width: '75%'}}
            onClick={handleSelectFolder}
            >
              Select Folder
          </Button>
        </div>
        <SelectedFolder />        
        <Divider />
        <TreeItems />
        <Divider />
 
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <Typography paragraph />
          <Conversation />            
      </Main>
    </Box>
  );
}
