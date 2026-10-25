importScripts('model.js');
self.onmessage=event=>{
  const {id,params}=event.data;
  try{const result=Interferometry.simulate(params);self.postMessage({id,result},[result.image.buffer,result.beam.buffer,result.sky.buffer]);}
  catch(error){self.postMessage({id,error:error.message});}
};
