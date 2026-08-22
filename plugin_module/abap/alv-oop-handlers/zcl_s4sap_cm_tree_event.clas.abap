class ZCL_S4SAP_CM_TREE_EVENT definition
  public
  create public .

public section.

  types:
    BEGIN OF TY_EVENTLIST,
    event TYPE formname,
    form  TYPE formname,
    method type string,
    repid TYPE sy-repid,
          END OF TY_EVENTLIST .
  types:
    TT_EVENTLIST TYPE TABLE OF TY_EVENTLIST .

  data MT_EVENTLIST type TT_EVENTLIST .
  data MV_LOCAL_CLASS_DEFINITION type STRING .

  methods CONSTRUCTOR
    importing
      !IV_REPID type SY-REPID default SY-CPROG
      !IV_LOCAL_CLASS_DEFINITION type STRING .
  methods HANDLE_NODE_DOUBLE_CLICK
    for event NODE_DOUBLE_CLICK of CL_GUI_ALV_TREE
    importing
      !NODE_KEY
      !SENDER .
  methods HANDLE_CHECKBOX_CHANGE
    for event CHECKBOX_CHANGE of CL_GUI_ALV_TREE
    importing
      !CHECKED
      !FIELDNAME
      !NODE_KEY
      !SENDER .
  methods HANDLE_EXPAND_NC
    for event EXPAND_NC of CL_GUI_ALV_TREE
    importing
      !NODE_KEY
      !SENDER .
  methods HANDLE_HEADER_CLICK
    for event HEADER_CLICK of CL_GUI_ALV_TREE
    importing
      !FIELDNAME
      !SENDER .
  methods HANDLE_ITEM_CONTEXT_MENU_RQ
    for event ITEM_CONTEXT_MENU_REQUEST of CL_GUI_ALV_TREE
    importing
      !FIELDNAME
      !MENU
      !NODE_KEY
      !SENDER .
  methods HANDLE_ITEM_CONTEXT_MENU_SEL
    for event ITEM_CONTEXT_MENU_SELECTED of CL_GUI_ALV_TREE
    importing
      !FCODE
      !FIELDNAME
      !NODE_KEY
      !SENDER .
  methods HANDLE_ITEM_DOUBLE_CLICK
    for event ITEM_DOUBLE_CLICK of CL_GUI_ALV_TREE
    importing
      !FIELDNAME
      !NODE_KEY
      !SENDER .
  methods HANDLE_ITEM_KEYPRESS
    for event ITEM_KEYPRESS of CL_GUI_ALV_TREE
    importing
      !FIELDNAME
      !KEY
      !NODE_KEY
      !SENDER .
  methods HANDLE_LINK_CLICK
    for event LINK_CLICK of CL_GUI_ALV_TREE
    importing
      !FIELDNAME
      !NODE_KEY
      !SENDER .
  methods HANDLE_NODE_CONTEXT_MENU_RQ
    for event NODE_CONTEXT_MENU_REQUEST of CL_GUI_ALV_TREE
    importing
      !MENU
      !NODE_KEY
      !SENDER .
  methods HANDLE_NODE_CONTEXT_MENU_SEL
    for event NODE_CONTEXT_MENU_SELECTED of CL_GUI_ALV_TREE
    importing
      !FCODE
      !NODE_KEY
      !SENDER .
  methods HANDLE_NODE_KEYPRESS
    for event NODE_KEYPRESS of CL_GUI_ALV_TREE
    importing
      !KEY
      !NODE_KEY
      !SENDER .
  methods HANDLE_ON_DRAG
    for event ON_DRAG of CL_GUI_ALV_TREE
    importing
      !DRAG_DROP_OBJECT
      !FIELDNAME
      !NODE_KEY
      !SENDER .
  methods HANDLE_ON_DRAG_MULTIPLE
    for event ON_DRAG_MULTIPLE of CL_GUI_ALV_TREE
    importing
      !DRAG_DROP_OBJECT
      !FIELDNAME
      !NODE_KEY_TABLE
      !SENDER .
  methods HANDLE_ON_DROP
    for event ON_DROP of CL_GUI_ALV_TREE
    importing
      !DRAG_DROP_OBJECT
      !NODE_KEY
      !SENDER .
  methods HANDLE_ON_DROP_COMPLETE
    for event ON_DROP_COMPLETE of CL_GUI_ALV_TREE
    importing
      !DRAG_DROP_OBJECT
      !FIELDNAME
      !NODE_KEY
      !SENDER .
  methods HANDLE_ON_DROP_COMPLETE_MULT
    for event ON_DROP_COMPLETE_MULTIPLE of CL_GUI_ALV_TREE
    importing
      !DRAG_DROP_OBJECT
      !FIELDNAME
      !NODE_KEY_TABLE
      !SENDER .
  methods HANDLE_ON_DROP_EXTERNAL_FILES
    for event ON_DROP_EXTERNAL_FILES of CL_GUI_ALV_TREE
    importing
      !NODE_KEY
      !FILES
      !SENDER .
  methods HANDLE_ON_DROP_GET_FLAVOR
    for event ON_DROP_GET_FLAVOR of CL_GUI_ALV_TREE
    importing
      !DRAG_DROP_OBJECT
      !NODE_KEY
      !SENDER .
  methods HANDLE_SELECTION_CHANGED
    for event SELECTION_CHANGED of CL_GUI_ALV_TREE
    importing
      !NODE_KEY
      !SENDER .
protected section.
private section.
ENDCLASS.



CLASS ZCL_S4SAP_CM_TREE_EVENT IMPLEMENTATION.


  METHOD CONSTRUCTOR.

    MV_LOCAL_CLASS_DEFINITION
    = |\\PROGRAM={ IV_REPID }| &&
      |\\CLASS={ IV_LOCAL_CLASS_DEFINITION }|.


    MT_EVENTLIST = VALUE #(
                   REPID = SY-CPROG
    ( EVENT = 'HANDLE_NODE_DOUBLE_CLICK' )
    ( EVENT = 'HANDLE_CHECKBOX_CHANGE' )
    ( EVENT = 'HANDLE_EXPAND_NC' )
    ( EVENT = 'HANDLE_HEADER_CLICK' )
    ( EVENT = 'HANDLE_ITEM_CONTEXT_MENU_RQ' )
    ( EVENT = 'HANDLE_ITEM_CONTEXT_MENU_SEL' )
    ( EVENT = 'HANDLE_ITEM_KEYPRESS' )
    ( EVENT = 'HANDLE_LINK_CLICK' )
    ( EVENT = 'HANDLE_NODE_CONTEXT_MENU_RQ' )
    ( EVENT = 'HANDLE_NODE_CONTEXT_MENU_SEL' )
    ( EVENT = 'HANDLE_NODE_KEYPRESS' )
    ( EVENT = 'HANDLE_ON_DRAG' )
    ( EVENT = 'HANDLE_ON_DRAG_MULTIPLE' )
    ( EVENT = 'HANDLE_ON_DROP' )
    ( EVENT = 'HANDLE_ON_DROP_COMPLETE' )
    ( EVENT = 'HANDLE_ON_DROP_COMPLETE_MULT' )
    ( EVENT = 'HANDLE_ON_DROP_EXTERNAL_FILES' )
    ( EVENT = 'HANDLE_ON_DROP_GET_FLAVOR' )
    ( EVENT = 'HANDLE_SELECTION_CHANGED' )

                           ).

  ENDMETHOD.


  METHOD HANDLE_CHECKBOX_CHANGE.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_CHECKBOX_CHANGE'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING NODE_KEY
                                            FIELDNAME
                                            CHECKED
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY  = NODE_KEY
                FIELDNAME = FIELDNAME
                CHECKED   = CHECKED
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY  = NODE_KEY
                FIELDNAME = FIELDNAME
                CHECKED   = CHECKED.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_EXPAND_NC.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_EXPAND_NC'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_HEADER_CLICK.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_HEADER_CLICK'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FIELDNAME
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ITEM_CONTEXT_MENU_RQ.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ITEM_CONTEXT_MENU_RQ'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FIELDNAME
                                            MENU
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.

            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                MENU      = MENU
                NODE_KEY  = NODE_KEY
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                MENU      = MENU
                NODE_KEY  = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ITEM_CONTEXT_MENU_SEL.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ITEM_CONTEXT_MENU_SEL'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FIELDNAME
                                            FCODE
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                FCODE     = FCODE
                NODE_KEY  = NODE_KEY
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                FCODE     = FCODE
                NODE_KEY  = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ITEM_DOUBLE_CLICK.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ITEM_DOUBLE_CLICK'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FIELDNAME
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                NODE_KEY  = NODE_KEY
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                NODE_KEY  = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ITEM_KEYPRESS.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ITEM_KEYPRESS'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FIELDNAME
                                            KEY
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                KEY       = KEY
                NODE_KEY  = NODE_KEY
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                KEY       = KEY
                NODE_KEY  = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_LINK_CLICK.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_LINK_CLICK'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FIELDNAME
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                NODE_KEY  = NODE_KEY
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FIELDNAME = FIELDNAME
                NODE_KEY  = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_NODE_CONTEXT_MENU_RQ.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_NODE_CONTEXT_MENU_RQ'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING MENU
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                MENU     = MENU
                NODE_KEY = NODE_KEY
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                MENU     = MENU
                NODE_KEY = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_NODE_CONTEXT_MENU_SEL.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_NODE_CONTEXT_MENU_SEL'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FCODE
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FCODE    = FCODE
                NODE_KEY = NODE_KEY
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FCODE    = FCODE
                NODE_KEY = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_NODE_DOUBLE_CLICK.


    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_NODE_DOUBLE_CLICK'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_NODE_KEYPRESS.


    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_NODE_KEYPRESS'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING KEY
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                KEY      = KEY
                NODE_KEY = NODE_KEY
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                KEY      = KEY
                NODE_KEY = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_ON_DRAG.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DRAG'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING DRAG_DROP_OBJECT
                                            FIELDNAME
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY         = NODE_KEY
                SENDER           = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY         = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_ON_DRAG_MULTIPLE.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DRAG_MULTIPLE'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING DRAG_DROP_OBJECT
                                            FIELDNAME
                                            NODE_KEY_TABLE
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY_TABLE   = NODE_KEY_TABLE
                SENDER           = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY_TABLE   = NODE_KEY_TABLE.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ON_DROP.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DROP'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING DRAG_DROP_OBJECT
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                NODE_KEY         = NODE_KEY
                SENDER           = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                NODE_KEY         = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ON_DROP_COMPLETE.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DROP_COMPLETE'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING DRAG_DROP_OBJECT
                                            FIELDNAME
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY         = NODE_KEY
                SENDER           = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY         = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ON_DROP_COMPLETE_MULT.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DROP_COMPLETE_MULT'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING DRAG_DROP_OBJECT
                                            FIELDNAME
                                            NODE_KEY_TABLE
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY_TABLE   = NODE_KEY_TABLE
                SENDER           = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                FIELDNAME        = FIELDNAME
                NODE_KEY_TABLE   = NODE_KEY_TABLE.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_ON_DROP_EXTERNAL_FILES.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DROP_EXTERNAL_FILES'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING NODE_KEY
                                            FILES
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY
                FILES    = FILES
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY
                FILES    = FILES.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ON_DROP_GET_FLAVOR.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ON_DROP_GET_FLAVOR'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING DRAG_DROP_OBJECT
                                            NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.

            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                NODE_KEY         = NODE_KEY
                SENDER           = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                DRAG_DROP_OBJECT = DRAG_DROP_OBJECT
                NODE_KEY         = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_SELECTION_CHANGED.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_SELECTION_CHANGED'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING NODE_KEY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OTREE( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY
                SENDER   = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                NODE_KEY = NODE_KEY.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.
ENDCLASS.
