class ZCX_S4SAP_EXCP definition
  public
  inheriting from CX_STATIC_CHECK
  final
  create public .

public section.

  interfaces IF_T100_MESSAGE .
  interfaces IF_T100_DYN_MSG .

  constants:
    begin of NO_DATA,
      msgid type symsgid value 'S_UNIFIED_CON',
      msgno type symsgno value '013',
      attr1 type scx_attrname value '',
      attr2 type scx_attrname value '',
      attr3 type scx_attrname value '',
      attr4 type scx_attrname value '',
    end of NO_DATA .
  constants:
    begin of ZCX_S4SAP_EXCP,
      msgid type symsgid value 'S_UNIFIED_CON',
      msgno type symsgno value '000',
      attr1 type scx_attrname value 'MSGV1',
      attr2 type scx_attrname value 'MSGV2',
      attr3 type scx_attrname value 'MSGV3',
      attr4 type scx_attrname value 'MSGV4',
    end of ZCX_S4SAP_EXCP .
  class-data MV_ERRMSG type CHAR255 .
  class-data MV_ERRMSG2 type CHAR255 .
  class-data MV_ERRMSG3 type CHAR255 .
  class-data MV_ERRMSG4 type CHAR255 .

  methods CONSTRUCTOR
    importing
      !TEXTID like IF_T100_MESSAGE=>T100KEY optional
      !PREVIOUS like PREVIOUS optional
      !MV_ERRMSG type CHAR255 optional
      !MV_ERRMSG2 type CHAR255 optional
      !MV_ERRMSG3 type CHAR255 optional
      !MV_ERRMSG4 type CHAR255 optional .
  class-methods RAISE
    importing
      !IV_MESSAGE type CSEQUENCE optional
      value(IO_ERROR) type ref to CX_ROOT optional
    raising
      ZCX_S4SAP_EXCP .
protected section.
private section.
ENDCLASS.



CLASS ZCX_S4SAP_EXCP IMPLEMENTATION.


  method CONSTRUCTOR.
CALL METHOD SUPER->CONSTRUCTOR
EXPORTING
PREVIOUS = PREVIOUS
.
me->MV_ERRMSG = MV_ERRMSG .
me->MV_ERRMSG2 = MV_ERRMSG2 .
me->MV_ERRMSG3 = MV_ERRMSG3 .
me->MV_ERRMSG4 = MV_ERRMSG4 .
clear me->textid.
if textid is initial.
  IF_T100_MESSAGE~T100KEY = ZCX_S4SAP_EXCP .
else.
  IF_T100_MESSAGE~T100KEY = TEXTID.
endif.
  endmethod.


  method RAISE.

  DATA : ls_msg type SCX_T100KEY.

  DATA:
    BEGIN OF ls_string,
      part1 TYPE symsgv,
      part2 TYPE symsgv,
      part3 TYPE symsgv,
      part4 TYPE symsgv,
    END OF ls_string.
  DATA lv_incl TYPE syrepid.
  DATA lv_line TYPE i.
  DATA lv_text TYPE string.

  " From string
  IF iv_message IS NOT INITIAL.
    ls_string = iv_message.
  ENDIF.

  WHILE ls_string IS INITIAL AND io_error IS NOT INITIAL.
    ls_string = io_error->get_text( ).

    " For debug
    io_error->get_source_position(
     IMPORTING
       include_name = lv_incl
       source_line  = lv_line ).
    " put break-point here ---> { lv_incl } - { lv_line }

    io_error = io_error->previous.
  ENDWHILE.

  " Any error based on system message
  IF ls_string IS INITIAL.
    MESSAGE ID sy-msgid TYPE 'E' NUMBER sy-msgno WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4 INTO ls_string.
    ls_msg-msgid = sy-msgid.
    ls_msg-msgno = sy-msgno.
    ls_msg-ATTR1 = ls_string-part1.
    ls_msg-ATTR2 = ls_string-part2.
    ls_msg-ATTR3 = ls_string-part3.
    ls_msg-ATTR4 = ls_string-part4.
  ELSE.
    ls_msg-msgid = ZCX_S4SAP_EXCP-MSGID.
    ls_msg-msgno = ZCX_S4SAP_EXCP-msgno.
    ls_msg-ATTR1 = ls_string-part1.
    ls_msg-ATTR2 = ls_string-part2.
    ls_msg-ATTR3 = ls_string-part3.
    ls_msg-ATTR4 = ls_string-part4.
  ENDIF.

  " Devided to blocks
  RAISE EXCEPTION TYPE ZCX_S4SAP_EXCP
    EXPORTING
      textid = ls_msg
      MV_ERRMSG   = CONV #( ls_msg-ATTR1 )
      MV_ERRMSG2  = CONV #( ls_msg-ATTR2 )
      MV_ERRMSG3  = CONV #( ls_msg-ATTR3 )
      MV_ERRMSG4  = CONV #( ls_msg-ATTR4 ).

  endmethod.
ENDCLASS.
